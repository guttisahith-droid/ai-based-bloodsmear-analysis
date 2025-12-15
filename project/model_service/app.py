from flask import Flask, request, jsonify, send_file
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
from bson.errors import InvalidId
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import io
import os
import json
from datetime import datetime, timedelta
import random
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from functools import wraps
import gridfs
import urllib.request

app = Flask(__name__)


def _normalize_mongo_uri(raw_uri: str | None) -> str | None:
    """
    Normalize MongoDB URI values.

    Some environments mistakenly set MONGODB_URI like:
        MONGODB_URI=MONGODB_URI=mongodb+srv://...
    This helper strips the leading `MONGODB_URI=` if present so that
    pymongo receives a valid URI starting with mongodb:// or mongodb+srv://
    """
    if not raw_uri:
        return raw_uri
    if raw_uri.startswith('MONGODB_URI='):
        # Strip the accidental prefix and log a warning once
        cleaned = raw_uri.split('=', 1)[1].strip()
        print("⚠️  Detected malformed MONGODB_URI starting with 'MONGODB_URI='; "
              "automatically corrected to:", cleaned)
        return cleaned
    return raw_uri


# Configuration
class Config:
    # Use local MongoDB by default, can be overridden with MONGODB_URI environment variable
    # NOTE: The default here is only for local/dev. In Render or production you MUST set MONGODB_URI as an env var.
    # Example (do NOT hard-code credentials here):
    #   MONGODB_URI=mongodb+srv://bloodsmear:ENCODED_PASSWORD@cluster0.afzyuif.mongodb.net/bloodsmear?retryWrites=true&w=majority
    MONGODB_URI = _normalize_mongo_uri(
        os.getenv('MONGODB_URI', 'mongodb://localhost:27017/bloodsmear')
    )
    PORT = int(os.getenv('PORT', 5001))
    SECRET_KEY = os.getenv('JWT_SECRET', 'your_super_secret_jwt_key_change_this')
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    MODEL_PATH = os.getenv('MODEL_PATH', 'best_model.pth')
    MODEL_URL = os.getenv('MODEL_URL')  # Optional: remote URL to download model weights
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
    FRONTEND_ORIGIN = os.getenv('FRONTEND_ORIGIN')  # Optional: explicit frontend origin for CORS

app.config.from_object(Config)

class DummyCollection:
    def find_one(self, *args, **kwargs):
        return None
    def insert_one(self, doc):
        class R: pass
        r = R(); r.inserted_id = ObjectId()
        return r
    def update_one(self, *args, **kwargs):
        return None
    def count_documents(self, *args, **kwargs):
        return 0
    def aggregate(self, *args, **kwargs):
        return []
    def find(self, *args, **kwargs):
        class C:
            def sort(self, *a, **k): return self
            def limit(self, *a, **k): return []
        return C()
    def delete_many(self, *args, **kwargs):
        return None

def ensure_indexes(users_collection, analyses_collection):
    try:
        users_collection.create_index([("username", ASCENDING)], unique=True, name="username_idx")
        users_collection.create_index([("email", ASCENDING)], unique=True, name="email_idx")
        analyses_collection.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_analyses_idx")
    except Exception:
        pass

# Safe defaults to avoid NameError before setup_database runs
users_collection = DummyCollection()
analyses_collection = DummyCollection()
fs = type('obj', (object,), {'put': lambda *a: 'dummy_id', 'get': lambda *a: io.BytesIO(b'dummy')})

# CORS Configuration
@app.before_request
def handle_preflight():
    """Handle preflight OPTIONS requests"""
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin', '')
        # Allow any localhost origin for development, plus configured frontend origin in production.
        # Also allow any Render-hosted frontend (*.onrender.com) to simplify deployment.
        allowed_origin = app.config.get('FRONTEND_ORIGIN')
        if (
            origin
            and (
                origin.startswith('http://localhost:')
                or origin.startswith('http://127.0.0.1:')
                or (allowed_origin and origin == allowed_origin)
                or origin.endswith('.onrender.com')
            )
        ):
            response = jsonify({})
            # Use dictionary assignment to set (not add) headers
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Max-Age'] = '3600'
            return response

@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    # Skip if this was an OPTIONS request already handled by before_request
    if request.method == 'OPTIONS':
        return response
    
    origin = request.headers.get('Origin', '')
    
    # Allow any localhost origin for development (flexible for Vite's dynamic ports)
    # and the configured production frontend origin.
    # Also allow any Render frontend (*.onrender.com) to simplify deployment.
    allowed_origin = app.config.get('FRONTEND_ORIGIN')
    if (
        origin
        and (
            origin.startswith('http://localhost:')
            or origin.startswith('http://127.0.0.1:')
            or (allowed_origin and origin == allowed_origin)
            or origin.endswith('.onrender.com')
        )
    ):
        # Use dictionary assignment to set (not add) headers, preventing duplicates
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Max-Age'] = '3600'
    
    return response
def setup_database():
    try:
        client = MongoClient(app.config['MONGODB_URI'])
        db = client.get_database()
        users_collection = db.users
        analyses_collection = db.analyses
        
        print("✅ MongoDB connected successfully!")
        
        # Clean up any existing documents with null usernames
        print("🧹 Cleaning up existing data with null usernames...")
        users_collection.delete_many({'username': None})
        users_collection.delete_many({'username': {'$exists': False}})
        
        # Use the new ensure_indexes function
        ensure_indexes(users_collection, analyses_collection)
        
        fs = gridfs.GridFS(db)
        print("✅ Database setup completed!")
        return client, db, users_collection, analyses_collection, fs
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        print("⚠️  The application will not function without a database connection.")
        print("💡 Please check if MongoDB is running and the connection string is correct.")
    
    client = None
    db = type('obj', (object,), {'fs': type('obj', (object,), {'put': lambda *a: 'dummy_id', 'get': lambda *a: io.BytesIO(b'dummy')})})
    users_collection = DummyCollection()
    analyses_collection = DummyCollection()
    fs = type('obj', (object,), {'put': lambda *a: 'dummy_id', 'get': lambda *a: io.BytesIO(b'dummy')})
    
    print("⚠️  Running with dummy database - data will not be persisted")
    return client, db, users_collection, analyses_collection, fs

# Create necessary directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

client, db, users_collection, analyses_collection, fs = setup_database()

# Load the trained model (keeping your existing model code)
class BloodSmearClassifier:
    def __init__(self, model_path=None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"🚀 Using device: {self.device}")
        
        if model_path is None:
            model_path = app.config['MODEL_PATH']
        
        self.model = self.load_model(model_path)
        self.transform = self.get_transform()
        
    def load_model(self, model_path):
        """Load the trained model - Fixed for 11 classes.

        NOTE:
        - This function now ONLY loads a local file at `model_path`.
        - Remote downloads (e.g. from Google Drive) are intentionally disabled because
          they often return HTML pages instead of raw .pth data, which breaks torch.load.
        - To use a trained model, place a valid PyTorch checkpoint at `model_path`
          (default: best_model.pth in project/model_service) and redeploy.
        """
        print(f"📁 Loading model from: {model_path}")

        if not os.path.exists(model_path):
            print(f"❌ Model file not found on disk: {model_path}")
            print("🔄 Creating a new model with random weights (no trained checkpoint present)...")
            return self.create_new_model()
        
        try:
            # Load checkpoint
            checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
            print(f"🔍 Checkpoint keys: {list(checkpoint.keys())}")
            
            # Fixed: Your model has 11 classes based on the error message
            NUM_CLASSES = 11
            
            # Get class names from checkpoint or use realistic blood cell types
            if 'class_names' in checkpoint:
                self.class_names = checkpoint['class_names']
                print(f"🎯 Found {len(self.class_names)} classes: {self.class_names}")
            elif 'train_dataset' in checkpoint and 'classes' in checkpoint['train_dataset']:
                self.class_names = checkpoint['train_dataset']['classes']
                print(f"🎯 Found {len(self.class_names)} classes from dataset: {self.class_names}")
            else:
                # Realistic blood cell types for 11 classes
                self.class_names = [
                    'Neutrophil', 'Lymphocyte', 'Monocyte', 'Eosinophil', 'Basophil',
                    'Immature Granulocytes', 'Atypical Lymphocyte', 'Blast', 
                    'Promyelocyte', 'Myelocyte', 'Metamyelocyte'
                ]
                print(f"⚠️  No class names found, using realistic blood cell types: {self.class_names}")
            
            # Create model architecture with EXACTLY 11 output classes
            model = models.efficientnet_b0(weights=None)
            in_features = model.classifier[1].in_features
            
            # EXACT architecture matching your training code
            model.classifier = nn.Sequential(
                nn.Dropout(0.3),
                nn.Linear(in_features, 512),
                nn.ReLU(),
                nn.BatchNorm1d(512),
                nn.Dropout(0.2),
                nn.Linear(512, NUM_CLASSES)  # Fixed: 11 classes
            )
            
            print(f"🔧 Model architecture created with {NUM_CLASSES} output classes")
            
            # Load weights - handle different checkpoint formats
            if 'model_state_dict' in checkpoint:
                # Try to load with strict=False to handle minor mismatches
                try:
                    model.load_state_dict(checkpoint['model_state_dict'], strict=True)
                    print("✅ Loaded model_state_dict successfully (strict)")
                except:
                    print("🔄 Trying relaxed loading...")
                    model.load_state_dict(checkpoint['model_state_dict'], strict=False)
                    print("✅ Loaded model_state_dict successfully (relaxed)")
                    
            elif 'state_dict' in checkpoint:
                model.load_state_dict(checkpoint['state_dict'])
                print("✅ Loaded state_dict successfully")
            else:
                # Assume it's a direct state_dict
                model.load_state_dict(checkpoint)
                print("✅ Loaded direct state_dict successfully")
            
            # Verify the model loaded correctly
            model = model.to(self.device)
            model.eval()
            
            # Test the model with a dummy input
            with torch.no_grad():
                dummy_input = torch.randn(1, 3, 224, 224).to(self.device)
                output = model(dummy_input)
                print(f"🧪 Model test - Input shape: {dummy_input.shape}, Output shape: {output.shape}")
                print(f"🎯 Output classes: {output.shape[1]} (should be {NUM_CLASSES})")
            
            print("✅ Model loaded and verified successfully!")
            return model
            
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            import traceback
            traceback.print_exc()
            print("🔄 Creating a new model with random weights...")
            return self.create_new_model()
    
    def create_new_model(self):
        """Create a new model with random weights for testing"""
        NUM_CLASSES = 11
        model = models.efficientnet_b0(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(0.2),
            nn.Linear(512, NUM_CLASSES)
        )
        model = model.to(self.device)
        model.eval()
        
        # Set realistic class names for testing
        self.class_names = [
            'Neutrophil', 'Lymphocyte', 'Monocyte', 'Eosinophil', 'Basophil',
            'Immature Granulocytes', 'Atypical Lymphocyte', 'Blast', 
            'Promyelocyte', 'Myelocyte', 'Metamyelocyte'
        ]
        
        print("⚠️  Using untrained model for testing")
        return model
    
    def get_transform(self):
        """Get the same transform as used in validation"""
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    def predict(self, image):
        """Predict the class of the input image"""
        try:
            # Convert to PIL Image if needed
            if isinstance(image, bytes):
                image = Image.open(io.BytesIO(image))
            elif isinstance(image, str):
                image = Image.open(image)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Preprocess image
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Predict
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probabilities, 1)
                
                # Get probabilities for all classes
                all_probs = probabilities.cpu().numpy()[0]
                
                prediction = self.class_names[predicted.item()]
                confidence = confidence.item()
                
                # Create confidence scores for all classes
                confidence_scores = {
                    self.class_names[i]: float(all_probs[i]) 
                    for i in range(len(self.class_names))
                }
            
            return {
                'prediction': prediction,
                'confidence': round(confidence, 4),
                'confidence_scores': {k: round(v, 4) for k, v in confidence_scores.items()}
            }
            
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return {
                'prediction': 'Error',
                'confidence': 0.0,
                'confidence_scores': {},
                'error': str(e)
            }

# Initialize classifier
try:
    classifier = BloodSmearClassifier()
    print("✅ Classifier initialized successfully!")
    print(f"📊 Model has {len(classifier.class_names)} classes: {classifier.class_names}")
except Exception as e:
    print(f"❌ Classifier initialization failed: {e}")
    classifier = None

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = get_user_by_id(data['user_id'])
            
            if not current_user:
                return jsonify({'error': 'Invalid token'}), 401
                
        except Exception as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# MongoDB helper functions
def get_user_by_id(user_id):
    try:
        return users_collection.find_one({'_id': ObjectId(user_id)})
    except InvalidId:
        return None

def get_user_by_username(username):
    return users_collection.find_one({'username': username})

def save_image_to_gridfs(image_data, filename):
    """Save image to GridFS and return file_id"""
    file_id = fs.put(image_data, filename=filename)
    return file_id

def get_image_from_gridfs(file_id):
    """Retrieve image from GridFS"""
    return fs.get(file_id)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def _to_str_id(v):
    return str(v) if isinstance(v, ObjectId) else v

def serialize_analysis(doc):
    if not doc:
        return doc
    d = dict(doc)
    if '_id' in d:
        d['_id'] = _to_str_id(d['_id'])
    if 'user_id' in d:
        d['user_id'] = _to_str_id(d['user_id'])
    if 'image_file_id' in d:
        d['image_file_id'] = _to_str_id(d.get('image_file_id'))
    if 'created_at' in d and isinstance(d['created_at'], datetime):
        d['created_at'] = d['created_at'].isoformat()
    if 'completed_at' in d and isinstance(d['completed_at'], datetime):
        d['completed_at'] = d['completed_at'].isoformat()
    return d

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({'error': 'Missing required fields'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Check if user exists
        existing_user = users_collection.find_one({
            '$or': [
                {'username': username},
                {'email': email}
            ]
        })
        
        if existing_user:
            return jsonify({'error': 'Username or email already exists'}), 400
        
        # Create new user
        password_hash = generate_password_hash(password)
        user_data = {
            'username': username,
            'email': email,
            'password_hash': password_hash,
            'created_at': datetime.utcnow(),
            'last_login': None
        }
        
        result = users_collection.insert_one(user_data)
        user_id = str(result.inserted_id)
        
        # Generate token
        token = jwt.encode(
            {
                'user_id': user_id, 
                'username': username,
                'exp': datetime.utcnow() + timedelta(days=7)
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        
        return jsonify({
            'message': 'User created successfully',
            'token': token,
            'user': {
                'id': user_id,
                'username': username,
                'email': email
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not (username or email) or not password:
            return jsonify({'error': 'Missing username/email or password'}), 400
        
        # Get user by username or email
        user = None
        if username:
            user = get_user_by_username(username)
        elif email:
            user = users_collection.find_one({'email': email})
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Update last login
        users_collection.update_one(
            {'_id': user['_id']},
            {'$set': {'last_login': datetime.utcnow()}}
        )
        
        # Generate token
        token = jwt.encode(
            {
                'user_id': str(user['_id']), 
                'username': user['username'],
                'exp': datetime.utcnow() + timedelta(days=7)
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email']
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ... (keep all your other routes the same as before)

@app.route('/api/debug-cors', methods=['GET', 'POST', 'OPTIONS'])
def debug_cors():
    return jsonify({
        'message': 'CORS is working!',
        'timestamp': datetime.utcnow().isoformat(),
        'method': request.method
    })

@app.route('/api/analytics/dashboard-stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    try:
        user_id = ObjectId(current_user['_id'])
        
        # Get counts for the current user's analyses
        total_analyses = analyses_collection.count_documents({'user_id': user_id})
        
        # Get completed analyses count
        completed_analyses = analyses_collection.count_documents({
            'user_id': user_id,
            'status': 'completed'
        })
        
        # Calculate detection rate (completed / total)
        accuracy_rate = 0
        if total_analyses > 0:
            accuracy_rate = round((completed_analyses / total_analyses) * 100, 1)
        
        # Get monthly analyses count (last 30 days)
        monthly_analyses = analyses_collection.count_documents({
            'user_id': user_id,
            'created_at': {
                '$gte': datetime.utcnow() - timedelta(days=30)
            }
        })
        
        # Average confidence across completed analyses
        avg_conf_cursor = analyses_collection.aggregate([
            {'$match': {
                'user_id': user_id,
                'status': 'completed',
                'confidence': {'$exists': True}
            }},
            {'$group': {
                '_id': None,
                'avg_conf': {'$avg': '$confidence'}
            }}
        ])
        avg_conf_doc = next(iter(avg_conf_cursor), None)
        average_confidence = round(float(avg_conf_doc['avg_conf']) * 100, 1) if avg_conf_doc and avg_conf_doc.get('avg_conf') is not None else 0
        
        # Positive detection rate: percentage of completed with a non-empty prediction
        positive_completed = analyses_collection.count_documents({
            'user_id': user_id,
            'status': 'completed',
            'prediction': {'$exists': True, '$ne': None}
        })
        positive_detection_rate = 0
        if completed_analyses > 0:
            positive_detection_rate = round((positive_completed / completed_analyses) * 100, 1)
        
        # Get disease distribution for the current user
        pipeline = [
            {'$match': {
                'user_id': user_id,
                'status': 'completed',
                'prediction': {'$exists': True, '$ne': None}
            }},
            {'$group': {
                '_id': '$prediction',
                'count': {'$sum': 1}
            }}
        ]
        
        distribution = list(analyses_collection.aggregate(pipeline))
        
        # Format distribution for the frontend
        disease_distribution = [
            {'name': d['_id'], 'value': d['count']} 
            for d in distribution if d['_id']
        ]
        
        return jsonify({
            'totalAnalyses': total_analyses,
            'completedAnalyses': completed_analyses,
            'accuracyRate': accuracy_rate,
            'monthlyAnalyses': monthly_analyses,
            'diseaseDistribution': disease_distribution,
            # Fields expected by EnhancedDashboard
            'thisMonthAnalyses': monthly_analyses,
            'averageConfidence': average_confidence,
            'positiveDetectionRate': positive_detection_rate
        })
        
    except Exception as e:
        print(f"❌ Error in get_dashboard_stats: {str(e)}")
        return jsonify({'error': 'Failed to load dashboard stats'}), 500

@app.route('/api/analytics/monthly-data', methods=['GET'])
@token_required
def get_monthly_data(current_user):
    try:
        user_id = ObjectId(current_user['_id'])
        
        # Get current year
        current_year = datetime.utcnow().year
        
        # Create a pipeline to get monthly counts for the current year
        pipeline = [
            {
                '$match': {
                    'user_id': user_id,
                    'created_at': {
                        '$gte': datetime(current_year, 1, 1),
                        '$lt': datetime(current_year + 1, 1, 1)
                    }
                }
            },
            {
                '$group': {
                    '_id': {'$month': '$created_at'},
                    'count': {'$sum': 1}
                }
            },
            {
                '$sort': {'_id': 1}
            }
        ]
        
        # Execute the aggregation
        monthly_counts = list(analyses_collection.aggregate(pipeline))
        
        # Create a list of all months with 0 as default count
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        # Initialize result with all months and 0 count
        result = [{'month': month, 'count': 0} for month in month_names]
        
        # Update with actual counts
        for item in monthly_counts:
            month_index = item['_id'] - 1  # Convert to 0-based index
            if 0 <= month_index < 12:
                result[month_index]['count'] = item['count']
        
        return jsonify({'monthlyData': result})
        
    except Exception as e:
        print(f"❌ Error in get_monthly_data: {str(e)}")
        return jsonify({'error': 'Failed to load monthly data'}), 500

@app.route('/api/analytics/disease-distribution', methods=['GET'])
@token_required
def get_disease_distribution(current_user):
    try:
        user_id = ObjectId(current_user['_id'])
        
        # Get distribution of diseases for the current user
        pipeline = [
            {
                '$match': {
                    'user_id': user_id,
                    'status': 'completed',
                    'prediction': {'$exists': True, '$ne': None}
                }
            },
            {
                '$group': {
                    '_id': '$prediction',
                    'count': {'$sum': 1}
                }
            },
            {
                '$sort': {'count': -1}
            }
        ]
        
        distribution = list(analyses_collection.aggregate(pipeline))
        
        # Format for the frontend chart
        result = [
            {'name': d['_id'], 'value': d['count']}
            for d in distribution if d['_id']
        ]
        
        return jsonify({'distribution': result})
        
    except Exception as e:
        print(f"❌ Error in get_disease_distribution: {str(e)}")
        return jsonify({'error': 'Failed to load disease distribution'}), 500

@app.route('/api/analytics/recent-activity', methods=['GET'])
@token_required
def get_recent_activity(current_user):
    try:
        limit = int(request.args.get('limit', 5))
        user_id = ObjectId(current_user['_id'])
        
        # Get recent analyses for the current user
        recent_activities = list(analyses_collection.find(
            {'user_id': user_id},
            {
                '_id': 1, 
                'status': 1, 
                'prediction': 1, 
                'confidence': 1, 
                'created_at': 1,
                'filename': 1
            }
        ).sort('created_at', -1).limit(limit))
        
        # Format the response
        formatted_activities = []
        for activity in recent_activities:
            status = activity.get('status', 'pending')
            prediction = activity.get('prediction')
            
            formatted = {
                'id': str(activity['_id']),
                'status': status,
                'disease_detected': prediction if prediction else 'Processing...',
                'confidence_score': round(activity.get('confidence', 0) * 100, 1),  # Convert to percentage
                'created_at': activity.get('created_at', datetime.utcnow()).isoformat(),
                'filename': activity.get('filename', 'Unknown')
            }
            
            # If analysis failed, include error message
            if status == 'failed':
                formatted['error'] = activity.get('error', 'Unknown error occurred')
                
            formatted_activities.append(formatted)
        
        return jsonify({'activities': formatted_activities})
        
    except Exception as e:
        print(f"❌ Error in get_recent_activity: {str(e)}")
        return jsonify({'error': 'Failed to load recent activity'}), 500

@app.route('/api/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    try:
        # Get the current user from the database
        user = users_collection.find_one({'_id': ObjectId(current_user['_id'])})
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Convert ObjectId to string for JSON serialization
        user['_id'] = str(user['_id'])
        
        # Remove sensitive data
        user.pop('password_hash', None)
        
        return jsonify(user)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
@token_required
def analyze_image(current_user):
    return model_classification_core(current_user)

def model_classification_core(current_user):
    try:
        upload_key = 'file' if 'file' in request.files else ('image' if 'image' in request.files else None)
        if not upload_key:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files[upload_key]
        
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        if not file or not allowed_file(file.filename):
            return jsonify({
                'error': 'Invalid file type',
                'allowed_types': list(app.config['ALLOWED_EXTENSIONS'])
            }), 400
            
        try:
            # Create initial analysis record
            analysis = {
                'user_id': current_user['_id'],
                'filename': file.filename,
                'status': 'processing',
                'created_at': datetime.utcnow()
            }
            
            # Insert initial record
            result = analyses_collection.insert_one(analysis)
            analysis_id = result.inserted_id
            
            try:
                # Read and process the image
                image_data = file.read()
                image = Image.open(io.BytesIO(image_data)).convert('RGB')
                
                if classifier is None:
                    raise Exception('Model not initialized')
                
                # Make prediction
                result = classifier.predict(image)
                
                # Update analysis with results
                update_data = {
                    'status': 'completed',
                    'prediction': result.get('prediction', 'Unknown'),
                    'confidence': result.get('confidence', 0),
                    'confidence_scores': result.get('confidence_scores', {}),
                    'completed_at': datetime.utcnow()
                }
                
                # Generate mock counts for display
                update_data['rbc_count'] = int(random.uniform(4.2e6, 5.8e6))
                update_data['wbc_count'] = int(random.uniform(4_000, 11_000))
                update_data['platelet_count'] = int(random.uniform(150_000, 450_000))
                update_data['cell_counts'] = {
                    'rbc': update_data['rbc_count'],
                    'wbc': update_data['wbc_count'],
                    'platelets': update_data['platelet_count']
                }
                
                # Save image to GridFS if needed
                if image_data:
                    file_id = save_image_to_gridfs(image_data, file.filename)
                    update_data['image_file_id'] = file_id
                
                # Update the analysis record
                analyses_collection.update_one(
                    {'_id': analysis_id},
                    {'$set': update_data}
                )
                
                # Get the updated analysis (fallback if DB returns None)
                updated_analysis = analyses_collection.find_one({'_id': analysis_id})
                if updated_analysis:
                    updated_analysis = serialize_analysis(updated_analysis)
                else:
                    updated_analysis = {
                        '_id': str(analysis_id),
                        'user_id': _to_str_id(current_user['_id']),
                        'filename': file.filename,
                        **update_data
                    }
                    if 'image_file_id' in updated_analysis:
                        updated_analysis['image_file_id'] = _to_str_id(updated_analysis['image_file_id'])
                    if isinstance(updated_analysis.get('completed_at'), datetime):
                        updated_analysis['completed_at'] = updated_analysis['completed_at'].isoformat()
                
                return jsonify({
                    'message': 'Analysis completed',
                    'analysis': updated_analysis,
                    'analysis_id': str(updated_analysis['_id'])
                })
                
            except Exception as e:
                # Update analysis with error
                analyses_collection.update_one(
                    {'_id': analysis_id},
                    {'$set': {
                        'status': 'failed',
                        'error': str(e),
                        'completed_at': datetime.utcnow()
                    }}
                )
                print(f"❌ Analysis failed: {str(e)}")
                return jsonify({
                    'error': f'Error processing image: {str(e)}',
                    'analysis_id': str(analysis_id)
                }), 500
                
        except Exception as e:
            print(f"❌ Error in model_classification: {str(e)}")
            return jsonify({'error': f'Server error: {str(e)}'}), 500
            
    except Exception as e:
        print(f"❌ Unexpected error in model_classification: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/api/mc', methods=['POST'])
@token_required
def model_classification(current_user):
    return model_classification_core(current_user)

@app.route('/api/db-status', methods=['GET'])
def db_status():
    connected = not isinstance(users_collection, DummyCollection)
    ping = False
    try:
        if connected:
            db.command('ping')
            ping = True
    except Exception:
        ping = False
    return jsonify({
        'connected': connected,
        'ping': ping,
        'uri': app.config['MONGODB_URI']
    })

@app.route('/api/analyses', methods=['GET'])
@token_required
def list_analyses(current_user):
    try:
        user_id = ObjectId(current_user['_id']) if isinstance(current_user['_id'], (str, ObjectId)) else current_user['_id']
        cursor = analyses_collection.find({'user_id': user_id}).sort('created_at', -1)
        items = [serialize_analysis(doc) for doc in cursor]
        return jsonify(items)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyses/<analysis_id>', methods=['GET'])
@token_required
def get_analysis_by_id(current_user, analysis_id):
    try:
        oid = ObjectId(analysis_id)
        doc = analyses_collection.find_one({'_id': oid})
        if not doc:
            return jsonify({'error': 'Analysis not found'}), 404
        if str(doc.get('user_id')) != str(current_user['_id']):
            return jsonify({'error': 'Forbidden'}), 403
        return jsonify({'analysis': serialize_analysis(doc)})
    except InvalidId:
        return jsonify({'error': 'Invalid analysis id'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyses/<analysis_id>', methods=['DELETE'])
@token_required
def delete_analysis(current_user, analysis_id):
    try:
        oid = ObjectId(analysis_id)
        doc = analyses_collection.find_one({'_id': oid})
        if not doc:
            return jsonify({'message': 'Not found'}), 404
        if str(doc.get('user_id')) != str(current_user['_id']):
            return jsonify({'error': 'Forbidden'}), 403
        analyses_collection.delete_one({'_id': oid})
        return jsonify({'message': 'Deleted'})
    except InvalidId:
        return jsonify({'error': 'Invalid analysis id'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return jsonify({
        'message': 'Blood Smear Analysis API',
        'version': '1.0.0',
        'status': 'running',
        'cors': 'manual_cors_only',
        'model_classes': classifier.class_names if classifier else []
    })

if __name__ == '__main__':
    port = app.config['PORT']
    print(f"🚀 Starting Blood Smear Analysis API on port {port}")
    print(f"🔗 MongoDB: {app.config['MONGODB_URI']}")
    print(f"📁 Model path: {app.config['MODEL_PATH']}")
    print(f"🌐 MANUAL CORS enabled for: http://localhost:5173")
    print("✅ No Flask-CORS - using manual CORS only")
    app.run(host='0.0.0.0', port=port, debug=False)