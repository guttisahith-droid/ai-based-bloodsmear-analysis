from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from torchvision.datasets import ImageFolder
from PIL import Image
import io
import base64
import os
import json
from datetime import datetime
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import uuid
from functools import wraps

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create necessary directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('models', exist_ok=True)

# Database initialization
def init_db():
    conn = sqlite3.connect('blood_smear.db')
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Analyses table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            image_filename TEXT,
            prediction TEXT,
            confidence REAL,
            normal_confidence REAL,
            parasitized_confidence REAL,
            analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

# Load the trained model
class BloodSmearClassifier:
    def __init__(self, model_path='models/best_model.pth'):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self.load_model(model_path)
        self.transform = self.get_transform()
        self.class_names = ['Normal', 'Parasitized']  # Update based on your actual classes
        
    def load_model(self, model_path):
        """Load the trained model"""
        import torchvision.models as models
        
        # Create model architecture (same as training)
        model = models.efficientnet_b0(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(0.2),
            nn.Linear(512, 2)  # Assuming 2 classes: Normal and Parasitized
        )
        
        # Load trained weights
        if os.path.exists(model_path):
            checkpoint = torch.load(model_path, map_location=self.device)
            model.load_state_dict(checkpoint['model_state_dict'])
            if 'class_names' in checkpoint:
                self.class_names = checkpoint['class_names']
        else:
            print(f"Warning: Model file {model_path} not found. Using untrained model.")
        
        model = model.to(self.device)
        model.eval()
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
                'confidence': confidence,
                'confidence_scores': confidence_scores,
                'all_predictions': confidence_scores
            }
            
        except Exception as e:
            print(f"Prediction error: {e}")
            return {
                'prediction': 'Error',
                'confidence': 0.0,
                'confidence_scores': {},
                'error': str(e)
            }

# Initialize classifier
classifier = BloodSmearClassifier()

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = get_user_by_id(data['user_id'])
            
            if not current_user:
                return jsonify({'error': 'Invalid token'}), 401
                
        except Exception as e:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# Database helper functions
def get_db_connection():
    conn = sqlite3.connect('blood_smear.db')
    conn.row_factory = sqlite3.Row
    return conn

def get_user_by_id(user_id):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    return user

def get_user_by_username(username):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    conn.close()
    return user

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if user exists
        conn = get_db_connection()
        existing_user = conn.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?', 
            (username, email)
        ).fetchone()
        
        if existing_user:
            conn.close()
            return jsonify({'error': 'Username or email already exists'}), 400
        
        # Create new user
        password_hash = generate_password_hash(password)
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash)
        )
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Generate token
        token = jwt.encode(
            {'user_id': user_id, 'username': username},
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
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Missing username or password'}), 400
        
        # Get user
        user = get_user_by_username(username)
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate token
        token = jwt.encode(
            {'user_id': user['id'], 'username': user['username']},
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
@token_required
def analyze_image(current_user):
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Save uploaded file
        filename = f"{uuid.uuid4()}_{file.filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Analyze image
        result = classifier.predict(filepath)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 500
        
        # Save analysis to database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO analyses 
            (user_id, image_filename, prediction, confidence, normal_confidence, parasitized_confidence)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            current_user['id'],
            filename,
            result['prediction'],
            result['confidence'],
            result['confidence_scores'].get('Normal', 0),
            result['confidence_scores'].get('Parasitized', 0)
        ))
        analysis_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'analysis_id': analysis_id,
            'prediction': result['prediction'],
            'confidence': result['confidence'],
            'confidence_scores': result['confidence_scores'],
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyses', methods=['GET'])
@token_required
def get_analyses(current_user):
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        conn = get_db_connection()
        
        # Get total count
        total = conn.execute(
            'SELECT COUNT(*) FROM analyses WHERE user_id = ?', 
            (current_user['id'],)
        ).fetchone()[0]
        
        # Get analyses
        analyses = conn.execute('''
            SELECT * FROM analyses 
            WHERE user_id = ? 
            ORDER BY analysis_date DESC 
            LIMIT ? OFFSET ?
        ''', (current_user['id'], limit, offset)).fetchall()
        
        conn.close()
        
        analyses_list = []
        for analysis in analyses:
            analyses_list.append({
                'id': analysis['id'],
                'image_filename': analysis['image_filename'],
                'prediction': analysis['prediction'],
                'confidence': analysis['confidence'],
                'normal_confidence': analysis['normal_confidence'],
                'parasitized_confidence': analysis['parasitized_confidence'],
                'analysis_date': analysis['analysis_date']
            })
        
        return jsonify({
            'analyses': analyses_list,
            'total': total,
            'page': page,
            'total_pages': (total + limit - 1) // limit
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyses/<int:analysis_id>', methods=['GET'])
@token_required
def get_analysis(current_user, analysis_id):
    try:
        conn = get_db_connection()
        analysis = conn.execute(
            'SELECT * FROM analyses WHERE id = ? AND user_id = ?',
            (analysis_id, current_user['id'])
        ).fetchone()
        conn.close()
        
        if not analysis:
            return jsonify({'error': 'Analysis not found'}), 404
        
        return jsonify({
            'id': analysis['id'],
            'image_filename': analysis['image_filename'],
            'prediction': analysis['prediction'],
            'confidence': analysis['confidence'],
            'normal_confidence': analysis['normal_confidence'],
            'parasitized_confidence': analysis['parasitized_confidence'],
            'analysis_date': analysis['analysis_date']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyses/<int:analysis_id>/image', methods=['GET'])
@token_required
def get_analysis_image(current_user, analysis_id):
    try:
        conn = get_db_connection()
        analysis = conn.execute(
            'SELECT image_filename FROM analyses WHERE id = ? AND user_id = ?',
            (analysis_id, current_user['id'])
        ).fetchone()
        conn.close()
        
        if not analysis:
            return jsonify({'error': 'Analysis not found'}), 404
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], analysis['image_filename'])
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'Image not found'}), 404
        
        return send_file(filepath, mimetype='image/jpeg')
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    try:
        conn = get_db_connection()
        
        # Total analyses
        total_analyses = conn.execute(
            'SELECT COUNT(*) FROM analyses WHERE user_id = ?',
            (current_user['id'],)
        ).fetchone()[0]
        
        # Recent analyses (last 7 days)
        recent_analyses = conn.execute('''
            SELECT COUNT(*) FROM analyses 
            WHERE user_id = ? AND analysis_date >= datetime('now', '-7 days')
        ''', (current_user['id'],)).fetchone()[0]
        
        # Prediction distribution
        prediction_stats = conn.execute('''
            SELECT prediction, COUNT(*) as count 
            FROM analyses 
            WHERE user_id = ? 
            GROUP BY prediction
        ''', (current_user['id'],)).fetchall()
        
        conn.close()
        
        stats = {
            'total_analyses': total_analyses,
            'recent_analyses': recent_analyses,
            'prediction_distribution': {
                row['prediction']: row['count'] for row in prediction_stats
            }
        }
        
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': classifier.model is not None,
        'device': str(classifier.device)
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)