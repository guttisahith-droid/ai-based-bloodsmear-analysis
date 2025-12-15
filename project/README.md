# Blood Smear AI Analysis Platform

A full-stack AI-powered blood disease detection platform with React frontend and Express/MongoDB backend.

## System Architecture

```
Frontend (React + TypeScript + Vite)
         ↓ HTTP/REST API
Backend (Express.js + MongoDB)
         ↓
MongoDB Database (localhost:27017)
```

## Prerequisites

- **Node.js** v18 or higher
- **MongoDB** running locally on port 27017
- MongoDB credentials:
  - Username: `bhanu`
  - Password: `bhanu123`
  - Auth database: `admin`

## Project Structure

```
blood-smear-ai/
├── server/                    # Backend API server
│   ├── src/
│   │   ├── models/           # Mongoose models
│   │   ├── controllers/      # Route controllers
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth & upload middleware
│   │   ├── config/           # Database config
│   │   └── server.js         # Main server file
│   ├── uploads/              # Uploaded images directory
│   ├── package.json
│   └── .env                  # Backend environment variables
│
├── src/                      # Frontend React app
│   ├── components/           # React components
│   ├── contexts/             # Auth context
│   ├── services/             # API services
│   └── lib/                  # API client
│
├── package.json              # Frontend dependencies
└── .env                      # Frontend environment variables
```

## Installation

### 1. Install Backend Dependencies

```bash
cd server
npm install
```

### 2. Install Python Dependencies for AI Model

The platform uses PyTorch for blood smear disease detection. Install the required packages:

```bash
cd server
pip3 install -r requirements.txt
```

Or using conda:
```bash
conda install pytorch torchvision pillow numpy opencv-python -c pytorch
```

**Note:** Ensure your PyTorch model file `best_combined_model.pth` is in `server/src/ml_models/`

### 3. Install Frontend Dependencies

```bash
cd ..
npm install
```

## Running the Application

### Step 1: Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Check if MongoDB is running
mongosh mongodb://bhanu:bhanu123@localhost:27017/bloodsmear?authSource=admin

# If not running, start MongoDB service
# On Ubuntu/Linux:
sudo systemctl start mongod

# On macOS (with Homebrew):
brew services start mongodb-community

# On Windows:
net start MongoDB
```

### Step 2: Start the Backend Server

```bash
cd server
npm run dev
```

The backend will start on `http://localhost:5000`

You should see:
```
MongoDB Connected: localhost
Database: bloodsmear
Server running in development mode on port 5000
```

### Step 3: Start the Frontend

In a new terminal:

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

### Step 4: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Environment Variables

### Backend (.env in server/)
```env
MONGODB_URI=mongodb://bhanu:bhanu123@localhost:27017/bloodsmear?authSource=admin
MONGODB_DB_NAME=bloodsmear
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
```

### Frontend (.env in root)
```env
VITE_API_URL=http://localhost:5000/api
```

## Features

### 🔐 Authentication
- Secure JWT-based authentication
- Email/password registration and login
- Protected routes and API endpoints

### 🔬 Blood Smear Analysis
- Drag-and-drop image upload
- AI-powered disease and cell type detection

**🧫 Parasitic Diseases Detected:**
  - Babesiosis
  - Leishmaniasis
  - Malaria
  - Trypanosomiasis
  - Trichomoniasis

**🩸 Blood Cell Types Identified:**
  - Basophil
  - Eosinophil
  - Lymphocyte
  - Monocyte
  - Neutrophil

### 📊 Dashboard & Analytics
- Real-time statistics
- Monthly performance charts
- Disease distribution pie charts
- Recent activity feed

### 📈 Advanced Features
- Automated cell counting (RBC, WBC, Platelets)
- Blood cell type identification (5 cell types)
- Disease probability confidence scores
- Clinical validation against expected ranges
- Detailed morphology analysis

### 📄 PDF Reports
- Comprehensive diagnostic reports
- One-click PDF download
- Professional medical report layout

### 🎥 Live Microscopy
- Webcam/microscope camera integration
- Real-time frame capture
- Recording capabilities

### 🔔 Notifications
- Real-time notifications when analyses complete
- Notification management panel
- Unread count badges

### 📜 History & Search
- Complete analysis history
- Advanced filtering and search
- Bulk operations (delete, export)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Analyses
- `POST /api/analyses` - Create analysis
- `POST /api/analyses/:id/process` - Process analysis
- `GET /api/analyses` - Get all analyses
- `GET /api/analyses/:id` - Get analysis details
- `DELETE /api/analyses/:id` - Delete analysis

### Analytics
- `GET /api/analytics/dashboard-stats` - Dashboard statistics
- `GET /api/analytics/monthly-data` - Monthly data
- `GET /api/analytics/disease-distribution` - Disease distribution
- `GET /api/analytics/recent-activity` - Recent activity

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### File Upload
- `POST /api/upload` - Upload blood smear image

## MongoDB Collections

The application uses the following MongoDB collections:

- `users` - User accounts with hashed passwords
- `analyses` - Blood smear analysis records
- `diseaseclassifications` - Disease detection results with probabilities
- `cellcounts` - White blood cell differential data
- `notifications` - User notifications
- `usersettings` - User preferences and settings

## Development Notes

### Mock AI Analysis
The current implementation uses simulated AI analysis with realistic mock data. To integrate a real AI model:

1. Update `server/src/controllers/analysisController.js`
2. Replace the `generateMockAnalysisResults()` function
3. Add your AI model inference code
4. Adjust the processing time as needed

### File Uploads
Images are stored in `server/uploads/` directory. For production:
- Consider using cloud storage (AWS S3, Google Cloud Storage)
- Implement image compression
- Add virus scanning for uploaded files

### Security Considerations
- Change `JWT_SECRET` in production
- Use HTTPS in production
- Implement rate limiting
- Add input validation and sanitization
- Use environment-specific CORS settings

## Troubleshooting

### MongoDB Connection Issues
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running
```bash
sudo systemctl status mongod
```

### Authentication Issues
```
Error: Invalid credentials
```
**Solution**: Clear localStorage and try registering a new account

### Port Already in Use
```
Error: Port 5000 is already in use
```
**Solution**: Change the PORT in `server/.env` or kill the process using port 5000

### CORS Errors
**Solution**: Verify frontend URL matches CORS configuration in `server/src/server.js`

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in server/.env
2. Update MongoDB connection string for production database
3. Configure proper CORS origins
4. Deploy to platforms like:
   - Railway
   - Heroku
   - DigitalOcean
   - AWS EC2

### Frontend
1. Build the production bundle:
```bash
npm run build
```

2. Deploy the `dist` folder to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - GitHub Pages

3. Update `VITE_API_URL` to point to production backend

## License

MIT

## Support

For issues or questions, please create an issue in the repository.
