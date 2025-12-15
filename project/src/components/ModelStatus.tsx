import { useEffect, useState } from 'react';
import { modelService } from '../services/api';

interface ModelStatusProps {
  className?: string;
}

interface ModelStatusData {
  status: 'loading' | 'loaded' | 'error';
  device: string;
  model_name: string;
  num_classes: number;
  last_updated: string;
  classes?: string[];
}

const ModelStatus = ({ className = '' }: ModelStatusProps) => {
  const [status, setStatus] = useState<ModelStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const [statusData, classesData] = await Promise.all([
          modelService.getStatus(),
          modelService.getClasses(),
        ]);
        
        setStatus({
          ...statusData,
          classes: classesData.classes || [],
        });
      } catch (err) {
        console.error('Error fetching model status:', err);
        setError('Failed to load model status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center text-sm text-gray-500 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse"></div>
        <span>Loading model status...</span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className={`flex items-center text-sm text-red-500 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
        <span>Model status unavailable</span>
      </div>
    );
  }

  const statusColor = status.status === 'loaded' ? 'bg-green-500' : 'bg-yellow-400';
  const statusText = status.status === 'loaded' ? 'Ready' : 'Loading';
  const deviceName = status.device === 'cuda' ? 'GPU' : 'CPU';

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
        title="Click for details"
      >
        <div className={`w-2 h-2 rounded-full ${statusColor} mr-2`}></div>
        <span>
          Model: {status.model_name} • {deviceName} • {status.num_classes} classes
        </span>
        <svg
          className={`ml-1 w-4 h-4 transition-transform ${showDetails ? 'transform rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDetails && (
        <div className="absolute bottom-full mb-2 right-0 w-64 bg-white rounded-md shadow-lg p-4 z-50 border border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-gray-900">Model Details</h4>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  status.status === 'loaded' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {statusText}
                </span>
              </dd>
            </div>
            
            <div className="flex justify-between">
              <dt className="text-gray-500">Device</dt>
              <dd className="font-medium">{deviceName}</dd>
            </div>
            
            <div className="flex justify-between">
              <dt className="text-gray-500">Model</dt>
              <dd className="font-medium">{status.model_name}</dd>
            </div>
            
            <div className="flex justify-between">
              <dt className="text-gray-500">Classes</dt>
              <dd className="font-medium">{status.num_classes}</dd>
            </div>
            
            <div className="flex justify-between">
              <dt className="text-gray-500">Last Updated</dt>
              <dd className="font-medium">
                {new Date(status.last_updated).toLocaleDateString()}
              </dd>
            </div>
            
            {status.classes && status.classes.length > 0 && (
              <div>
                <dt className="text-gray-500 mb-1">Class Labels</dt>
                <dd className="text-xs bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                  <ul className="space-y-1">
                    {status.classes.map((cls, idx) => (
                      <li key={idx} className="truncate">
                        <span className="text-gray-500 mr-1">{idx + 1}.</span>
                        {cls}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
};

export default ModelStatus;
