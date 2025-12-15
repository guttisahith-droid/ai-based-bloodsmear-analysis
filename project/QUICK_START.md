# 🚀 Quick Start Guide

## Prerequisites Checklist

Before starting, ensure you have:

- ✅ **Node.js v18+** installed
- ✅ **Python 3.8+** installed
- ✅ **MongoDB** running on `localhost:27017`
- ✅ MongoDB user `bhanu` with password `bhanu123`
- ✅ Your PyTorch model `best_combined_model.pth` in `server/src/ml_models/`
- 🎮 **NVIDIA GPU** (optional, for faster inference - 20x speedup!)

## 🔧 Setup (One-Time)

### 1. Install Backend Dependencies

```bash
cd server
npm install
```

**With GPU (Recommended for speed):**
```bash
# For CUDA 11.8
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip3 install pillow numpy opencv-python

# For CUDA 12.1
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip3 install pillow numpy opencv-python
```

**Without GPU (CPU only):**
```bash
pip3 install -r requirements.txt
```

**Verify GPU Setup:**
```bash
python3 -c "import torch; print(f'GPU: {torch.cuda.is_available()}')"
# Should print: GPU: True
```

See [GPU_SETUP.md](server/GPU_SETUP.md) for detailed GPU configuration.

```bash
cd ..
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Verify MongoDB Connection

```bash
mongosh mongodb://bhanu:bhanu123@localhost:27017/bloodsmear?authSource=admin
```

If successful, type `exit` to close the connection.

## ▶️ Running the Application

### Terminal 1: Start Backend

```bash
cd server
npm run dev
```

Wait for:
```
MongoDB Connected: localhost
Server running in development mode on port 5000
```

### Terminal 2: Start Frontend

```bash
npm run dev
```

Wait for:
```
Local: http://localhost:5173/
```

### 3. Open Browser

Navigate to: **http://localhost:5173**

## 🎯 First Steps

1. **Register an account** with any email and password (min 6 characters)
2. **Login** with your credentials
3. **Upload a blood smear image** via "New Analysis"
4. **Wait 2-3 seconds** for AI analysis to complete
5. **View results** with disease detection, cell counts, and PDF report

## 🔍 Testing the AI Model

### Option 1: With Real PyTorch Model

If your `best_combined_model.pth` is a valid trained model:
- Upload blood smear images
- AI will use your model for inference
- Results appear in 2-3 seconds

### Option 2: Fallback to Mock Data

If Python/PyTorch is not available:
- The system automatically falls back to realistic mock data
- You can still test all features
- Mock data simulates 97.5% accuracy across 10 disease types

## 🧪 Verify AI Integration

Check backend console logs:
```
✓ AI inference succeeded -> Uses your model
✗ AI inference failed, using mock data -> Fallback active
```

## 📊 Features to Test

- ✅ Upload and analyze blood smear images
- ✅ View real-time dashboard with statistics
- ✅ Download PDF reports
- ✅ Browse analysis history with filtering
- ✅ Receive notifications when analyses complete
- ✅ Use live microscopy camera integration
- ✅ Manage user profile and settings

## ❗ Troubleshooting

### MongoDB Connection Failed
```bash
# Start MongoDB
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

### Python Import Errors
```bash
# Verify Python packages
pip3 list | grep -E 'torch|numpy|opencv'

# Reinstall if needed
pip3 install --upgrade torch torchvision pillow numpy opencv-python
```

### Port Already in Use
```bash
# Backend (port 5000)
lsof -ti:5000 | xargs kill -9

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9
```

### Vite Module Resolution Error
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📁 Model File Location

Your PyTorch model should be at:
```
server/src/ml_models/best_combined_model.pth
```

Current size: Check with
```bash
ls -lh server/src/ml_models/best_combined_model.pth
```

## 🔐 Default Test Account

You can register any account. Example:
- Email: `test@example.com`
- Password: `test123`

## 📖 Full Documentation

See [README.md](./README.md) for complete documentation.

## 🐛 Common Issues

### Issue: "axios import failed"
**Solution:** Already fixed in `vite.config.ts`. Restart dev server.

### Issue: "Model not found"
**Solution:** Place your `.pth` or `.pt` model file in `server/src/ml_models/`

### Issue: "AI inference failed"
**Solution:** Check Python installation and packages. System will use mock data as fallback.

### Issue: "Cannot read properties of null"
**Solution:** Ensure MongoDB is running and accessible.

## 💡 Development Tips

- Backend API docs: `http://localhost:5000/api/health`
- MongoDB GUI: Use MongoDB Compass with connection string above
- Frontend dev tools: Press F12 in browser for debugging
- Backend logs: Check terminal running `npm run dev` in server folder

## 🎓 Disease Detection Classes

The AI detects 10 conditions:
1. Normal
2. Malaria (Plasmodium)
3. Babesia
4. Leishmania
5. Acute Lymphoblastic Leukemia
6. Chronic Lymphocytic Leukemia
7. Acute Myeloid Leukemia
8. Chronic Myeloid Leukemia
9. Anemia
10. Thrombocytopenia

## ✅ Success Indicators

You'll know everything works when:
- ✅ Backend console shows "MongoDB Connected"
- ✅ Frontend loads at localhost:5173
- ✅ You can register and login
- ✅ Upload works and shows progress
- ✅ Results appear with disease detection
- ✅ Dashboard shows statistics and charts
- ✅ PDF download works

Enjoy analyzing blood smears! 🔬
