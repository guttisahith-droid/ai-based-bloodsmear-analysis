import os
from datetime import timedelta

class Config:
    # MongoDB Configuration - Using local MongoDB (no authentication by default)
    # For authenticated local MongoDB, use: 'mongodb://username:password@localhost:27017/bloodsmear?authSource=admin'
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/bloodsmear')
    
    # Server Configuration
    PORT = int(os.getenv('PORT', 5001))
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Security
    SECRET_KEY = os.getenv('JWT_SECRET', 'your_jwt_secret_here_fallback')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    
    # File Upload
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # Model Configuration
    MODEL_PATH = os.getenv('MODEL_PATH', r'C:\Users\SIVA\Downloads\project-bolt-sb1-zs7h2ak1\project\model_service\models\best_model.pth')
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}