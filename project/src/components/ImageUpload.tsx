import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export function ImageUpload({ onUpload, disabled }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onUpload(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {!preview ? (
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleChange}
            disabled={disabled}
          />

          <div className="flex flex-col items-center gap-4">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-6 rounded-full">
              <Upload className="w-12 h-12 text-blue-600" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Blood Smear Image
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop your microscopic blood smear image here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supports: JPG, PNG, TIFF (Max 10MB)
              </p>
            </div>

            <button
              type="button"
              className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              disabled={disabled}
            >
              Select Image
            </button>
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 bg-white">
          <div className="relative">
            <img
              src={preview}
              alt="Blood smear preview"
              className="w-full h-96 object-contain bg-gray-900"
            />
            <button
              onClick={clearPreview}
              disabled={disabled}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Image uploaded successfully</p>
                <p className="text-xs text-gray-600">Ready for AI analysis</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
