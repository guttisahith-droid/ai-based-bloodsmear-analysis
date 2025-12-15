import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisService } from '../services/api';
import AnalysisProgress from './AnalysisProgress';

interface UploadProps {
  onUploadStart?: () => void;
  onUploadComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  className?: string;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

const Upload = ({
  onUploadStart,
  onUploadComplete,
  onError,
  className = '',
  maxFileSize = 10, // 10MB default
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'],
}: UploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Handle file selection
  const handleFileChange = (file: File) => {
    // Reset previous state
    setError(null);
    
    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}. Please upload an image file.`);
      return;
    }
    
    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxFileSize}MB.`);
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, []);
  
  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };
  
  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setUploadStatus('uploading');
      setProgress(0);
      onUploadStart?.();
      
      // Start the upload with progress tracking
      const result = await analysisService.analyzeImage(selectedFile, (progress) => {
        setProgress(progress);
      });
      
      // Update status to processing
      setUploadStatus('processing');
      
      // Simulate processing (in a real app, you might have WebSocket or polling)
      const processingInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + 10, 95); // Cap at 95% until complete
          if (newProgress >= 95) {
            clearInterval(processingInterval);
          }
          return newProgress;
        });
      }, 500);
      
      // Simulate processing completion
      setTimeout(() => {
        clearInterval(processingInterval);
        setProgress(100);
        setUploadStatus('complete');
        onUploadComplete?.(result);
        
        // Navigate to results if we have an ID
        if (result?.id) {
          navigate(`/analysis/${result.id}`);
        }
      }, 3000);
      
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus('error');
      setError('Failed to upload and analyze the image. Please try again.');
      onError?.(err as Error);
    }
  };
  
  // Reset the form
  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploadStatus('idle');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File upload area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleInputChange}
          accept={allowedTypes.join(',')}
        />
        
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center justify-center space-y-4"
        >
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-64 max-w-full rounded-lg border border-gray-200"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                <span className="bg-white text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                  Change Image
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    Upload a file
                  </span>{' '}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  {allowedTypes.map(t => t.split('/')[1]).join(', ').toUpperCase()}{' '}
                  up to {maxFileSize}MB
                </p>
              </div>
            </>
          )}
        </label>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end space-x-3">
        {selectedFile && (
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploadStatus === 'uploading' || uploadStatus === 'processing'}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            !selectedFile || uploadStatus === 'uploading' || uploadStatus === 'processing'
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {uploadStatus === 'uploading' || uploadStatus === 'processing'
            ? 'Processing...'
            : 'Analyze Image'}
        </button>
      </div>

      {/* Progress indicator */}
      <AnalysisProgress
        progress={progress}
        status={uploadStatus}
        message={
          uploadStatus === 'uploading'
            ? 'Uploading your image...'
            : uploadStatus === 'processing'
            ? 'Analyzing blood smear...'
            : uploadStatus === 'complete'
            ? 'Analysis complete!'
            : uploadStatus === 'error'
            ? 'Analysis failed. Please try again.'
            : ''
        }
        showOnComplete={false}
      />
    </div>
  );
};

export default Upload;
