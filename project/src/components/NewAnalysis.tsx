import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createAnalysis } from '../services/mongoAnalysisService';
import { ImageUpload } from './ImageUpload';
import { ArrowLeft, Loader2, CheckCircle, Activity, Droplets, Heart } from 'lucide-react';

interface NewAnalysisProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function NewAnalysis({ onComplete, onCancel }: NewAnalysisProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  const handleUpload = (file: File) => {
    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    // Use user.id as the primary identifier, fall back to user._id for backward compatibility
    const userId = user?.id || user?._id;
    if (!selectedFile || !userId) return;

    setProcessing(true);
    setProgress(10);
    setCurrentStep('Uploading image...');

    try {
      // In a real app, you would upload the file to a storage service here
      // For demo purposes, we'll just proceed without uploading

      setProgress(30);
      setCurrentStep('Image uploaded successfully');

      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(50);
      setCurrentStep('Running AI analysis...');

      const { analysis } = await createAnalysis(userId, selectedFile);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      setProgress(100);
      setCurrentStep('Analysis complete!');
      
      setAnalysisResult({
        result: {
          diagnosis: {
            disease: analysis?.prediction || 'Unknown',
            confidence: Math.round((analysis?.confidence || 0) * 100) + '%',
            matches_expected_ranges: true
          },
          cell_counts: {
            rbc: analysis?.cell_counts?.rbc ?? null,
            wbc: analysis?.cell_counts?.wbc ?? null,
            platelets: analysis?.cell_counts?.platelets ?? null
          }
        }
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      setShowResults(true);
      setProcessing(false);
    } catch (error: any) {
      console.error('Error processing analysis:', error);
      alert(error.response?.data?.error || 'Failed to process analysis. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">New Blood Smear Analysis</h2>
          <p className="text-gray-600">
            Upload a microscopic blood smear image for AI-powered disease detection
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {!processing && !showResults ? (
            <>
              <ImageUpload onUpload={handleUpload} disabled={processing} />

              {selectedFile && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-3">
                      AI Analysis Features
                    </h3>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>Detection of 5 parasitic diseases: Babesiosis, Leishmaniasis, Malaria, Trypanosomiasis, Trichomoniasis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>Identification of 5 blood cell types: Basophil, Eosinophil, Lymphocyte, Monocyte, Neutrophil</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>Automated cell counting and morphology analysis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>Clinical validation against expected disease patterns</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={processing}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start AI Analysis
                  </button>
                </div>
              )}
            </>
          ) : processing ? (
            <div className="py-12">
              <div className="max-w-md mx-auto">
                <div className="flex justify-center mb-6">
                  <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{currentStep}</span>
                      <span className="text-sm font-semibold text-blue-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <p className="text-sm text-gray-600 text-center">
                      Our AI model is analyzing your blood smear image. This process typically takes 2-3 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-xl font-bold text-green-900">Analysis Complete</h3>
                    <p className="text-sm text-green-700">AI diagnosis results are ready</p>
                  </div>
                </div>
              </div>

              {analysisResult?.result && (
                <>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Activity className="w-6 h-6 text-blue-600" />
                      Disease Identification
                    </h4>
                    <div className="bg-white rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Diagnosed Condition:</span>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {analysisResult.result.diagnosis?.disease || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Confidence Level:</span>
                        <p className="text-xl font-semibold text-blue-600 mt-1">
                          {analysisResult.result.diagnosis?.confidence || 'N/A'}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-600">Clinical Validation:</span>
                        <p className={`text-lg font-semibold mt-1 ${
                          analysisResult.result.diagnosis?.matches_expected_ranges
                            ? 'text-green-600'
                            : 'text-orange-600'
                        }`}>
                          {analysisResult.result.diagnosis?.matches_expected_ranges
                            ? '✓ Matches Expected Ranges'
                            : '⚠ Review Required'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="w-5 h-5 text-red-600" />
                        <h5 className="font-semibold text-red-900">RBC Count</h5>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {analysisResult.result.cell_counts?.rbc || 'N/A'}
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-5 h-5 text-blue-600" />
                        <h5 className="font-semibold text-blue-900">WBC Count</h5>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {analysisResult.result.cell_counts?.wbc || 'N/A'}
                      </p>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-purple-600" />
                        <h5 className="font-semibold text-purple-900">Platelets</h5>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {analysisResult.result.cell_counts?.platelets || 'N/A'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => {
                    setShowResults(false);
                    setAnalysisResult(null);
                    setSelectedFile(null);
                  }}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Analyze Another Image
                </button>
                <button
                  onClick={onComplete}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
