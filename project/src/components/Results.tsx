import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analysisService } from '../services/api';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface Prediction {
  class: string;
  confidence: number;
}

interface AnalysisResult {
  id: string;
  filename: string;
  upload_date: string;
  analysis_date: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  predictions: Prediction[];
  image_url?: string;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

const Results = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'details'>('results');
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  // Format bytes to human-readable format
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get the status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
          text: 'Completed',
        };
      case 'processing':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>,
          text: 'Processing',
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: <div className="h-5 w-5 rounded-full border-2 border-yellow-500"></div>,
          text: 'Pending',
        };
      default:
        return {
          color: 'bg-red-100 text-red-800',
          icon: <XCircleIcon className="h-5 w-5 text-red-500" />,
          text: 'Failed',
        };
    }
  };

  // Get the top prediction
  const getTopPrediction = () => {
    if (!result || !result.predictions || result.predictions.length === 0) return null;
    return [...result.predictions].sort((a, b) => b.confidence - a.confidence)[0];
  };

  // Format class name for display
  const formatClassName = (className: string) => {
    return className
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get the interpretation for a prediction
  const getInterpretation = (prediction: Prediction) => {
    const className = prediction.class.toLowerCase();
    
    if (className.includes('uninfected') || className.includes('normal')) {
      return 'No signs of infection or abnormalities detected.';
    }
    
    if (className.includes('parasitized') || className.includes('malaria')) {
      return 'Malaria parasites detected. Please consult a healthcare professional for diagnosis and treatment.';
    }
    
    if (className.includes('babesia')) {
      return 'Babesia parasites detected. This is a tick-borne illness that requires medical attention.';
    }
    
    if (className.includes('leishmania')) {
      return 'Leishmania parasites detected. This is a parasitic disease transmitted by sandflies.';
    }
    
    if (className.includes('trypanosome')) {
      return 'Trypanosome parasites detected. This could indicate African sleeping sickness or Chagas disease.';
    }
    
    if (className.includes('neutrophil')) {
      return 'Elevated neutrophil count may indicate a bacterial infection or inflammation.';
    }
    
    if (className.includes('lymphocyte')) {
      return 'Elevated lymphocyte count may indicate a viral infection or immune response.';
    }
    
    if (className.includes('eosinophil')) {
      return 'Elevated eosinophil count may indicate an allergic reaction or parasitic infection.';
    }
    
    if (className.includes('basophil')) {
      return 'Elevated basophil count may indicate an allergic reaction or chronic inflammation.';
    }
    
    if (className.includes('monocyte')) {
      return 'Elevated monocyte count may indicate chronic inflammation or infection.';
    }
    
    return 'Abnormal blood cell morphology detected. Further medical evaluation is recommended.';
  };

  // Fetch analysis result
  useEffect(() => {
    const fetchResult = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await analysisService.getAnalysis(id);
        setResult(data);
        
        // Set the top prediction as selected by default
        if (data.predictions && data.predictions.length > 0) {
          setSelectedPrediction(
            [...data.predictions].sort((a, b) => b.confidence - a.confidence)[0]
          );
        }
      } catch (err) {
        console.error('Error fetching analysis result:', err);
        setError('Failed to load analysis results. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResult();
  }, [id]);

  // Handle retry
  const handleRetry = () => {
    setError(null);
    if (id) {
      // Refetch the result
      setLoading(true);
      analysisService.getAnalysis(id)
        .then(data => {
          setResult(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error refetching analysis result:', err);
          setError('Failed to load analysis results. Please try again later.');
          setLoading(false);
        });
    }
  };

  // Handle new analysis
  const handleNewAnalysis = () => {
    navigate('/analyze');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Error loading results</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 text-center">
          <InformationCircleIcon className="mx-auto h-12 w-12 text-blue-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
          <p className="mt-1 text-sm text-gray-500">The requested analysis could not be found.</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleNewAnalysis}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Start New Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(result.status);
  const topPrediction = getTopPrediction();

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Analysis Results</h2>
          <p className="mt-1 text-sm text-gray-500">
            Analyzed on {formatDate(result.analysis_date || result.upload_date)}
          </p>
        </div>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.icon}
            <span className="ml-1.5">{statusInfo.text}</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('results')}
            className={`${
              activeTab === 'results'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Results
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Details
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'results' ? (
          <div className="space-y-6">
            {/* Image and top prediction */}
            <div className="md:flex md:space-x-6 space-y-4 md:space-y-0">
              <div className="md:w-1/2">
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  {result.image_url ? (
                    <img
                      src={result.image_url}
                      alt="Blood smear analysis"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400">
                      No image available
                    </div>
                  )}
                </div>
              </div>
              
              <div className="md:w-1/2">
                {topPrediction && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-800">Top Prediction</h3>
                    <div className="mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {formatClassName(topPrediction.class)}
                        </span>
                        <span className="text-sm font-semibold text-blue-700">
                          {(topPrediction.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${topPrediction.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-blue-700">
                      <p>{getInterpretation(topPrediction)}</p>
                    </div>
                  </div>
                )}
                
                {result.status === 'completed' && result.predictions && result.predictions.length > 1 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">All Predictions</h3>
                    <div className="space-y-2">
                      {[...result.predictions]
                        .sort((a, b) => b.confidence - a.confidence)
                        .map((prediction, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${
                              selectedPrediction?.class === prediction.class
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                            onClick={() => setSelectedPrediction(prediction)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                {formatClassName(prediction.class)}
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {(prediction.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-blue-600"
                                style={{ width: `${prediction.confidence * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed interpretation */}
            {selectedPrediction && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  About {formatClassName(selectedPrediction.class)}
                </h3>
                <p className="text-sm text-gray-600">
                  {getInterpretation(selectedPrediction)}
                </p>
                {selectedPrediction.confidence < 0.7 && (
                  <p className="mt-2 text-sm text-yellow-700">
                    <InformationCircleIcon className="inline h-4 w-4 mr-1" />
                    This prediction has moderate confidence. A healthcare professional should review the results.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleNewAnalysis}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                New Analysis
              </button>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Report
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">File Information</h3>
              <dl className="mt-2 border-t border-b border-gray-200 divide-y divide-gray-200">
                <div className="py-3 flex justify-between text-sm font-medium">
                  <dt className="text-gray-500">Filename</dt>
                  <dd className="text-gray-900">{result.filename || 'N/A'}</dd>
                </div>
                <div className="py-3 flex justify-between text-sm">
                  <dt className="font-medium text-gray-500">Uploaded</dt>
                  <dd className="text-gray-900">{formatDate(result.upload_date)}</dd>
                </div>
                {result.metadata && (
                  <>
                    <div className="py-3 flex justify-between text-sm">
                      <dt className="font-medium text-gray-500">Dimensions</dt>
                      <dd className="text-gray-900">
                        {result.metadata.width} × {result.metadata.height} px
                      </dd>
                    </div>
                    <div className="py-3 flex justify-between text-sm">
                      <dt className="font-medium text-gray-500">Size</dt>
                      <dd className="text-gray-900">{formatBytes(result.metadata.size)}</dd>
                    </div>
                    <div className="py-3 flex justify-between text-sm">
                      <dt className="font-medium text-gray-500">Format</dt>
                      <dd className="text-gray-900 uppercase">{result.metadata.format || 'N/A'}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Analysis Information</h3>
              <dl className="mt-2 border-t border-b border-gray-200 divide-y divide-gray-200">
                <div className="py-3 flex justify-between text-sm">
                  <dt className="font-medium text-gray-500">Analysis ID</dt>
                  <dd className="text-gray-900 font-mono">{result.id || 'N/A'}</dd>
                </div>
                <div className="py-3 flex justify-between text-sm">
                  <dt className="font-medium text-gray-500">Status</dt>
                  <dd>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.icon}
                      <span className="ml-1.5">{statusInfo.text}</span>
                    </span>
                  </dd>
                </div>
                <div className="py-3 flex justify-between text-sm">
                  <dt className="font-medium text-gray-500">Analyzed</dt>
                  <dd className="text-gray-900">
                    {result.analysis_date ? formatDate(result.analysis_date) : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Results
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
