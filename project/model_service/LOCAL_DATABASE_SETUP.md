# Local MongoDB Setup Guide

The application has been configured to use a **local MongoDB database** instead of MongoDB Atlas (cloud).

## Quick Start

### 1. Install MongoDB (if not already installed)

**Windows:**
- Download from: https://www.mongodb.com/try/download/community
- Run the installer and follow the setup wizard
- MongoDB will typically install as a Windows service

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install mongodb
```

### 2. Start MongoDB

**Windows:**
- MongoDB should start automatically as a service
- Or manually: Open Command Prompt as Administrator and run:
  ```cmd
  net start MongoDB
  ```

**macOS:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
# or
sudo service mongod start
```

### 3. Verify MongoDB is Running

Open a new terminal and run:
```bash
mongosh
# or older versions:
mongo
```

You should see the MongoDB shell. Type `exit` to leave.

### 4. Configure the Application

The application is already configured to use:
```
mongodb://localhost:27017/bloodsmear
```

**No additional configuration needed!** The app will:
- Connect to MongoDB on `localhost:27017`
- Use the database named `bloodsmear`
- Create collections automatically (`users`, `analyses`)

### 5. Start the Flask Backend

```bash
cd project/model_service
python app.py
```

You should see:
```
✅ MongoDB connected successfully!
✅ Database setup completed!
```

## Connection String Format

### Default (No Authentication)
```
mongodb://localhost:27017/bloodsmear
```

### With Authentication
If you've set up authentication on your local MongoDB:
```
mongodb://username:password@localhost:27017/bloodsmear?authSource=admin
```

### Using Environment Variable
You can override the connection string using an environment variable:
```bash
# Windows PowerShell
$env:MONGODB_URI="mongodb://localhost:27017/bloodsmear"

# Windows CMD
set MONGODB_URI=mongodb://localhost:27017/bloodsmear

# macOS/Linux
export MONGODB_URI="mongodb://localhost:27017/bloodsmear"
```

## Troubleshooting

### "Cannot connect to MongoDB"

1. **Check if MongoDB is running:**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS
   brew services list | grep mongodb
   
   # Linux
   sudo systemctl status mongod
   ```

2. **Check if MongoDB is listening on port 27017:**
   ```bash
   # Windows
   netstat -an | findstr 27017
   
   # macOS/Linux
   lsof -i :27017
   ```

3. **Try connecting manually:**
   ```bash
   mongosh mongodb://localhost:27017
   ```

### "Authentication failed"

If you get authentication errors:
1. Check if MongoDB requires authentication
2. Update the connection string with credentials:
   ```
   mongodb://username:password@localhost:27017/bloodsmear?authSource=admin
   ```
3. Or disable authentication in MongoDB (development only)

### "Database setup failed"

1. Ensure MongoDB is running
2. Check the connection string in `app.py` or `config.py`
3. Verify you have permissions to create databases
4. Check MongoDB logs for errors

## Viewing Your Data

### Using MongoDB Compass (GUI)
1. Download: https://www.mongodb.com/try/download/compass
2. Connect to: `mongodb://localhost:27017`
3. Browse the `bloodsmear` database

### Using MongoDB Shell
```bash
mongosh
use bloodsmear
show collections
db.users.find()
db.analyses.find()
```

## Switching Back to Cloud MongoDB

If you need to use MongoDB Atlas again, set the environment variable:
```bash
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/bloodsmear"
```

Or update the default in `app.py` or `config.py`.

## Benefits of Local MongoDB

✅ **No internet required** - Works offline  
✅ **Faster** - No network latency  
✅ **Free** - No cloud costs  
✅ **Privacy** - Data stays on your machine  
✅ **Development** - Perfect for local development  

## Next Steps

1. ✅ MongoDB is installed and running
2. ✅ Application is configured for local MongoDB
3. ✅ Start the Flask backend: `python app.py`
4. ✅ Test registration/login in the frontend

Your data will now be stored locally in MongoDB!

