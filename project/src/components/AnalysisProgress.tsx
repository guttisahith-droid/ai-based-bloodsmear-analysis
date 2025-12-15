import { useEffect, useState } from 'react';

type Status = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

interface AnalysisProgressProps {
  progress: number;
  status: Status;
  message?: string;
  className?: string;
  showOnComplete?: boolean;
  autoHideDelay?: number;
}

const statusConfig = {
  idle: {
    color: 'bg-gray-200',
    text: 'Ready',
    icon: (
      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  uploading: {
    color: 'bg-blue-500',
    text: 'Uploading',
    icon: (
      <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ),
  },
  processing: {
    color: 'bg-yellow-500',
    text: 'Analyzing',
    icon: (
      <svg className="animate-spin h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ),
  },
  complete: {
    color: 'bg-green-500',
    text: 'Complete',
    icon: (
      <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    color: 'bg-red-500',
    text: 'Error',
    icon: (
      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

const AnalysisProgress = ({
  progress,
  status = 'idle',
  message,
  className = '',
  showOnComplete = true,
  autoHideDelay = 3000,
}: AnalysisProgressProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [localStatus, setLocalStatus] = useState<Status>(status);
  const [localProgress, setLocalProgress] = useState(progress);

  // Update local state when props change
  useEffect(() => {
    setLocalStatus(status);
    
    // Smooth progress bar animation
    const timer = setTimeout(() => {
      setLocalProgress(progress);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [status, progress]);

  // Handle auto-hide for complete/error states
  useEffect(() => {
    if ((status === 'complete' || status === 'error') && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        if (showOnComplete) {
          // Just reset the status but keep the component visible
          setLocalStatus('idle');
          setLocalProgress(0);
        } else {
          // Hide the component
          setIsVisible(false);
        }
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [status, autoHideDelay, showOnComplete]);

  // Show the component when there's active progress or a status change
  useEffect(() => {
    if (status !== 'idle' || (progress > 0 && progress < 100)) {
      setIsVisible(true);
    }
  }, [status, progress]);

  // Don't render if not visible
  if (!isVisible && status === 'idle' && (progress === 0 || progress >= 100)) {
    return null;
  }

  const config = statusConfig[localStatus] || statusConfig.idle;
  const displayMessage = message || config.text;
  const progressPercentage = Math.min(100, Math.max(0, localProgress));

  return (
    <div
      className={`fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${className}`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <div className="h-5 w-5">{config.icon}</div>
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{displayMessage}</p>
            <div className="mt-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${config.color} h-2 rounded-full transition-all duration-300 ease-out`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className="mt-1 text-xs text-gray-500 text-right">
                {progressPercentage.toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => setIsVisible(false)}
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Additional details for processing/complete states */}
      {(status === 'processing' || status === 'complete') && (
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Status: {status}</span>
            <span className="inline-flex items-center">
              <span className={`w-2 h-2 rounded-full ${config.color} mr-1`}></span>
              {statusConfig[status].text}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisProgress;
