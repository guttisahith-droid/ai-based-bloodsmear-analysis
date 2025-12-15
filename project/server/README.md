# Blood Smear AI - Backend Server

Express.js backend server with MongoDB for the Blood Smear AI Analysis Platform.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB running locally on port 27017
- MongoDB credentials: username `bhanu`, password `bhanu123`

## Installation

```bash
cd server
npm install
```

## Environment Variables

The `.env` file is already configured with:

```
MONGODB_URI=mongodb://bhanu:bhanu123@localhost:27017/bloodsmear?authSource=admin
MONGODB_DB_NAME=bloodsmear
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Analyses
- `POST /api/analyses` - Create new analysis (protected)
- `POST /api/analyses/:id/process` - Process analysis with AI (protected)
- `GET /api/analyses` - Get all user analyses (protected)
- `GET /api/analyses/:id` - Get single analysis with details (protected)
- `DELETE /api/analyses/:id` - Delete analysis (protected)

### Analytics
- `GET /api/analytics/dashboard-stats` - Get dashboard statistics (protected)
- `GET /api/analytics/monthly-data` - Get monthly analysis data (protected)
- `GET /api/analytics/disease-distribution` - Get disease distribution (protected)
- `GET /api/analytics/recent-activity` - Get recent analyses (protected)

### Notifications
- `GET /api/notifications` - Get all notifications (protected)
- `GET /api/notifications/unread-count` - Get unread count (protected)
- `PATCH /api/notifications/:id/read` - Mark as read (protected)
- `PATCH /api/notifications/read-all` - Mark all as read (protected)
- `DELETE /api/notifications/:id` - Delete notification (protected)

### File Upload
- `POST /api/upload` - Upload blood smear image (protected)

## MongoDB Collections

- `users` - User accounts
- `analyses` - Blood smear analyses
- `diseaseclassifications` - Disease detection results
- `cellcounts` - Cell count data
- `notifications` - User notifications
- `usersettings` - User preferences

## Testing the API

You can test the health endpoint:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Blood Smear API is running"
}
```

## Authentication

Protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## File Uploads

Uploaded images are stored in the `server/uploads` directory.

## Error Handling

All errors return JSON with a `message` field:
```json
{
  "message": "Error description"
}
```

## Notes

- The AI analysis is currently simulated with mock data
- Images are processed after 2 seconds to simulate AI processing time
- Notifications are automatically created when analyses complete
