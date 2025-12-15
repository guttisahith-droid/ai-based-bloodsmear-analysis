# 🚀 GPU Setup Guide for Blood Smear AI

This guide helps you set up GPU acceleration for faster blood smear analysis using your NVIDIA GPU.

## Prerequisites

- ✅ NVIDIA GPU (GTX/RTX series or better)
- ✅ NVIDIA drivers installed
- ✅ CUDA toolkit installed

## Check Your Setup

### 1. Verify GPU is Detected

```bash
nvidia-smi
```

You should see your GPU model, driver version, and CUDA version.

### 2. Check CUDA Version

```bash
nvcc --version
```

Note your CUDA version (e.g., 11.8 or 12.1)

## Install PyTorch with GPU Support

### For CUDA 11.8

```bash
cd server
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip3 install pillow numpy opencv-python
```

### For CUDA 12.1

```bash
cd server
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip3 install pillow numpy opencv-python
```

### For Other CUDA Versions

Visit: https://pytorch.org/get-started/locally/

Select your:
- PyTorch Build: Stable
- Your OS: Linux/Windows/Mac
- Package: Pip
- Language: Python
- Compute Platform: Your CUDA version

Copy and run the provided command.

## Verify GPU Installation

### Test PyTorch GPU Access

```bash
python3 -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"
```

Expected output:
```
CUDA Available: True
GPU: NVIDIA GeForce RTX 3080
```

### Check GPU Memory

```bash
python3 -c "import torch; print(f'GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB' if torch.cuda.is_available() else 'No GPU')"
```

## Optimizations Enabled

The AI inference script automatically uses:

### ✅ GPU Acceleration
- Model runs on CUDA device
- Automatic GPU memory management
- Mixed precision (FP16) for faster inference

### ✅ Performance Features
- `torch.backends.cudnn.benchmark = True` - Optimizes convolution operations
- `torch.cuda.amp.autocast()` - Mixed precision for 2-3x speedup
- `torch.cuda.empty_cache()` - Memory cleanup after each inference

### ✅ Monitoring
- GPU name and memory displayed in logs
- Inference time tracking
- Automatic fallback to CPU if GPU fails

## Expected Performance

### GPU (NVIDIA RTX 3080)
- **Inference Time:** 0.05-0.15 seconds per image
- **Throughput:** 20-60 images/second
- **Memory Usage:** 2-4 GB VRAM

### CPU (Fallback)
- **Inference Time:** 0.5-2 seconds per image
- **Throughput:** 1-5 images/second
- **Memory Usage:** 1-2 GB RAM

## Testing GPU Performance

### 1. Start the backend server

```bash
cd server
npm run dev
```

### 2. Upload a blood smear image

Watch the backend console for GPU logs:

```
✓ Using GPU: NVIDIA GeForce RTX 3080
✓ GPU Memory: 10.00 GB
✓ Model loaded successfully on cuda
✓ Inference completed in 0.08s
```

## Troubleshooting

### Issue: "CUDA Available: False"

**Possible causes:**
1. PyTorch installed without CUDA support
2. NVIDIA drivers not installed
3. CUDA toolkit version mismatch

**Solution:**
```bash
# Uninstall CPU-only PyTorch
pip3 uninstall torch torchvision

# Reinstall with CUDA support (adjust version)
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### Issue: "CUDA out of memory"

**Solution:**
The model should fit in 2-4 GB VRAM. If you get OOM errors:

1. Close other GPU-intensive applications
2. Reduce batch size (default is 1, already minimal)
3. Check GPU memory: `nvidia-smi`

### Issue: "No GPU detected"

**Check:**
```bash
# Verify GPU is visible
nvidia-smi

# Check if CUDA toolkit is installed
nvcc --version

# Reinstall NVIDIA drivers if needed
```

### Issue: Performance still slow on GPU

**Check:**
1. Verify CUDA version matches PyTorch installation
2. Ensure model is actually running on GPU (check logs)
3. Monitor GPU utilization: `watch -n 1 nvidia-smi`

## Model File Requirements

Your model `best_combined_model.pth` should be:
- PyTorch state dict or full model
- Compatible with your PyTorch version
- Located at: `server/src/ml_models/best_combined_model.pth`

## Monitoring GPU Usage

### During inference:

```bash
# Watch GPU utilization in real-time
watch -n 1 nvidia-smi

# Log GPU stats to file
nvidia-smi dmon -s u -c 100 > gpu_usage.log
```

Look for:
- GPU utilization spikes during analysis
- Memory allocation (should be 2-4 GB)
- Temperature (should be under 80°C)

## Multi-GPU Setup

If you have multiple GPUs, PyTorch will use GPU 0 by default. To use a specific GPU:

```bash
# Set GPU device
export CUDA_VISIBLE_DEVICES=0

# Or for GPU 1
export CUDA_VISIBLE_DEVICES=1

# Then start server
npm run dev
```

## Benchmarking

Test your GPU performance:

```bash
cd server/src/ai
python3 -c "
import torch
import time

device = torch.device('cuda')
print(f'Testing on: {torch.cuda.get_device_name(0)}')

# Warm up
x = torch.randn(1, 3, 224, 224).to(device)
for _ in range(10):
    _ = x * 2

# Benchmark
start = time.time()
for _ in range(100):
    _ = x * 2
    torch.cuda.synchronize()
elapsed = time.time() - start

print(f'Average time: {elapsed/100*1000:.2f}ms')
"
```

## Production Recommendations

1. **Use GPU in production** for best user experience
2. **Keep fallback to CPU** for reliability
3. **Monitor GPU health** regularly
4. **Set up alerts** for GPU failures
5. **Load balance** across multiple GPUs if needed

## Cost Optimization

For cloud deployments:
- **AWS:** p3.2xlarge (V100) ~$3/hour
- **GCP:** n1-standard-4 + T4 ~$0.50/hour
- **Azure:** NC6 (K80) ~$0.90/hour

Consider:
- Spot instances for 70% savings
- Auto-scaling based on demand
- CPU fallback for low-traffic periods

## Useful Commands

```bash
# GPU info
nvidia-smi -L

# Detailed GPU stats
nvidia-smi -q

# Monitor GPU memory
nvidia-smi --query-gpu=memory.used,memory.total --format=csv -l 1

# Check PyTorch build info
python3 -c "import torch; print(torch.__version__); print(torch.version.cuda)"

# Test model loading
cd server/src/ai
python3 inference.py /path/to/test/image.jpg ../ml_models/best_combined_model.pth
```

## Support

If you encounter issues:
1. Check backend console logs for GPU detection
2. Verify CUDA installation: `nvidia-smi`
3. Test PyTorch: `python3 -c "import torch; print(torch.cuda.is_available())"`
4. Review Python errors in backend console

GPU acceleration is optional - the system works on CPU as fallback!
