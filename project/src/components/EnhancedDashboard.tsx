import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut,
  Plus,
  Bell,
  User,
  TrendingUp,
  Activity,
  PieChart,
  Award,
  Eye,
  Clock,
  Video,
  FileText
} from 'lucide-react';
import { NewAnalysis } from './NewAnalysis';
import { AnalysisDetails } from './AnalysisDetails';
import { LiveMicroscopy } from './LiveMicroscopy';
import { HistoryPage } from './HistoryPage';
import { UserProfile } from './UserProfile';
import { NotificationPanel } from './NotificationPanel';
import { BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getDashboardStats,
  getMonthlyAnalysisData,
  getDiseaseDistribution,
  getRecentActivity,
  DashboardStats,
  MonthlyData,
  DiseaseDistribution
} from '../services';
import type { AnalysisResult as ActivityResult } from '../services/analyticsService';
import { format } from 'date-fns';
import { BrandLogo } from './BrandLogo';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#a855f7'];

type View = 'dashboard' | 'new-analysis' | 'analysis-details' | 'live-microscopy' | 'history' | 'profile';

export function EnhancedDashboard() {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [diseaseData, setDiseaseData] = useState<DiseaseDistribution[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityResult[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  useEffect(() => {
    if (currentView === 'dashboard') {
      loadDashboardData();
    }
  }, [currentView]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [statsData, monthlyChartData, diseaseChartData, activityData] = await Promise.all([
        getDashboardStats(user.id),
        getMonthlyAnalysisData(user.id),
        getDiseaseDistribution(user.id),
        getRecentActivity(user.id, 5)
      ]);

      setStats(statsData);
      setMonthlyData(monthlyChartData);
      setDiseaseData(diseaseChartData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
    }
  };

  const handleViewAnalysis = (analysisId: string) => {
    setSelectedAnalysisId(analysisId);
    setCurrentView('analysis-details');
  };

  const handleAnalysisComplete = () => {
    setCurrentView('dashboard');
    loadDashboardData();
  };

  const renderContent = () => {
    switch (currentView) {
      case 'new-analysis':
        return (
          <NewAnalysis
            onComplete={handleAnalysisComplete}
            onCancel={() => setCurrentView('dashboard')}
          />
        );
      case 'analysis-details':
        return selectedAnalysisId ? (
          <AnalysisDetails
            analysisId={selectedAnalysisId}
            onBack={() => setCurrentView('dashboard')}
          />
        ) : null;
      case 'live-microscopy':
        return <LiveMicroscopy onBack={() => setCurrentView('dashboard')} />;
      case 'history':
        return (
          <HistoryPage
            onBack={() => setCurrentView('dashboard')}
            onViewAnalysis={handleViewAnalysis}
          />
        );
      case 'profile':
        return <UserProfile onBack={() => setCurrentView('dashboard')} />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <BrandLogo className="flex-1 min-w-[260px]" />
            <div className="flex items-center gap-4 justify-end flex-wrap">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
                >
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </div>

              <button
                onClick={() => setCurrentView('profile')}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-600">View Profile</p>
                </div>
              </button>

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

      {showNotifications && (
        <NotificationPanel
          onClose={() => setShowNotifications(false)}
          onViewAnalysis={handleViewAnalysis}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-xl">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Analyses</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalAnalyses || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-4 rounded-xl">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.thisMonthAnalyses || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-4 rounded-xl">
                <Award className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Confidence</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.averageConfidence || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-4 rounded-xl">
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Detection Rate</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.positiveDetectionRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <button
            onClick={() => setCurrentView('new-analysis')}
            className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all transform hover:scale-105"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white/20 p-4 rounded-full">
                <Plus className="w-12 h-12" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">New Analysis</h3>
                <p className="text-sm text-white/80">Upload blood smear image</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('live-microscopy')}
            className="bg-white border-2 border-blue-200 rounded-xl shadow-md p-8 hover:shadow-lg transition-all hover:border-blue-400"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-4 rounded-full">
                <Video className="w-12 h-12 text-blue-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Live Microscopy</h3>
                <p className="text-sm text-gray-600">Real-time analysis</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('history')}
            className="bg-white border-2 border-gray-200 rounded-xl shadow-md p-8 hover:shadow-lg transition-all hover:border-gray-400"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="bg-gray-100 p-4 rounded-full">
                <Clock className="w-12 h-12 text-gray-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-1">View History</h3>
                <p className="text-sm text-gray-600">Browse past analyses</p>
              </div>
            </div>
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Monthly Performance
            </h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Disease Distribution
            </h3>
            {diseaseData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsPieChart>
                    <Pie
                      data={diseaseData}
                      dataKey="count"
                      nameKey="disease"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => entry.count > 0 ? `${entry.count}` : ''}
                      labelLine={false}
                    >
                      {diseaseData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} cases`, name]}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {diseaseData.map((entry, index) => (
                    <div key={entry.disease} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-700 truncate" title={entry.disease}>
                        {entry.disease} ({entry.count})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Recent Activity
            </h3>
            <button
              onClick={() => setCurrentView('history')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((analysis) => (
                <div
                  key={(analysis as any).id || (analysis as any)._id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        analysis.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : analysis.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {analysis.status}
                      </span>
                      {analysis.disease_detected && (
                        <span className="text-sm font-semibold text-gray-900">
                          {analysis.disease_detected}
                        </span>
                      )}
                      {analysis.confidence_score && (
                        <span className="text-sm text-gray-600">
                          {analysis.confidence_score.toFixed(1)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {format(new Date(analysis.created_at), 'MMM dd, yyyy hh:mm a')}
                    </p>
                  </div>

                  {analysis.status === 'completed' && (
                    <button
                      onClick={() => handleViewAnalysis((analysis as any).id || (analysis as any)._id)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          )}
        </div>
      </main>
    </div>
  );

  return renderContent();
}
