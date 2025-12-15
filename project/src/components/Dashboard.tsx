import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContextMongo';
import { getAnalyses, deleteAnalysis } from '../services/mongoAnalysisService';
import type { AnalysisResult } from '../services/mongoAnalysisService';
import { LogOut, Plus, Microscope, Clock, CheckCircle, AlertCircle, Trash2, Eye } from 'lucide-react';
import { NewAnalysis } from './NewAnalysis';
import { AnalysisDetails } from './AnalysisDetails';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAnalysis, setShowNewAnalysis] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);

  const loadAnalyses = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const data = await getAnalyses(user._id);
      setAnalyses(data);
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyses();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    try {
      await deleteAnalysis(id);
      setAnalyses(analyses.filter(a => a._id !== id));
    } catch (error) {
      console.error('Error deleting analysis:', error);
      alert('Failed to delete analysis');
    }
  };

  const handleAnalysisComplete = () => {
    setShowNewAnalysis(false);
    loadAnalyses();
  };

  if (selectedAnalysis) {
    return (
      <AnalysisDetails
        analysisId={selectedAnalysis}
        onBack={() => setSelectedAnalysis(null)}
      />
    );
  }

  if (showNewAnalysis) {
    return (
      <NewAnalysis
        onComplete={handleAnalysisComplete}
        onCancel={() => setShowNewAnalysis(false)}
      />
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-xl">
                <Microscope className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Blood Smear AI</h1>
                <p className="text-sm text-gray-600">AI-Powered Disease Detection</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-600">{analyses.length} analyses</p>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Analysis History</h2>
            <p className="text-gray-600">View and manage your blood smear analyses</p>
          </div>
          <button
            onClick={() => setShowNewAnalysis(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            New Analysis
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading analyses...</p>
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Microscope className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No analyses yet</h3>
            <p className="text-gray-600 mb-6">Upload your first blood smear image to get started</p>
            <button
              onClick={() => setShowNewAnalysis(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Start Analysis
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {analyses.map((analysis) => (
              <div
                key={analysis._id}
                className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(analysis.status)}
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                          analysis.status
                        )}`}
                      >
                        {analysis.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(analysis._id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {analysis.disease_detected && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Diagnosed Condition:</p>
                        <p className="text-2xl font-bold text-gray-900">{analysis.disease_detected}</p>
                      </div>
                    )}

                    {analysis.confidence_score !== null && analysis.confidence_score !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Confidence Level:</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {Number(analysis.confidence_score).toFixed(1)}%
                        </p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Analysis Date</p>
                      <p className="text-sm text-gray-900">
                        {new Date(analysis.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {analysis.status === 'completed' && (
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedAnalysis(analysis._id)}
                      className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Report
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
