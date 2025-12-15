# Blood Smear Analysis Model Service

This is a FastAPI service for running predictions on blood smear images using a pre-trained deep learning model.

## Setup

1. **Install Python 3.8+**

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Place Model File**
   - Copy your `best_model.pth` file to the project root directory (same level as `main.py`).

## Running the Service

### Development Mode
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### Production Mode
For production, use a production ASGI server like `gunicorn`:
```bash
pip install gunicorn

gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000 main:app
```

## API Endpoints

### GET /
Check if the API is running.

### POST /predict
Upload an image for prediction.

**Request:**
```
POST /predict
Content-Type: multipart/form-data

file: <image_file>
```

**Response:**
```json
{
  "status": "success",
  "prediction": "Parasitized",
  "confidence": 98.76,
  "probabilities": {
    "Normal": "1.24%",
    "Parasitized": "98.76%"
  }
}
```

## Environment Variables

- `PORT`: Port to run the server on (default: 8000)
- `MODEL_PATH`: Path to the model file (default: `../best_model.pth`)
