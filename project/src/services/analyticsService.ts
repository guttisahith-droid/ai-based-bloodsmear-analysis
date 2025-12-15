import api from '../lib/api';

export interface DashboardStats {
  totalAnalyses: number;
  accuracyRate: number;
  monthlyAnalyses: number;
  diseaseDistribution: Record<string, number>;
  thisMonthAnalyses?: number;
  averageConfidence?: number;
  positiveDetectionRate?: number;
}

export interface MonthlyData {
  month: string;
  count: number;
  [key: string]: any;
}

export interface DiseaseDistribution {
  disease: string;
  count: number;
  percent?: number;
  percentage: number;
  [key: string]: any;
}

export interface AnalysisResult {
  id?: string;
  _id: string;
  user_id: string;
  status: string;
  disease_detected: string;
  confidence_score: number;
  created_at: string;
  // Add other fields as needed
}

export async function getDashboardStats(_userId: string): Promise<DashboardStats> {
  const response = await api.get('/api/analytics/dashboard-stats');
  return response.data;
}

export async function getMonthlyAnalysisData(_userId: string): Promise<MonthlyData[]> {
  const response = await api.get('/api/analytics/monthly-data');
  return response.data.monthlyData;
}

export async function getDiseaseDistribution(_userId: string): Promise<DiseaseDistribution[]> {
  const response = await api.get('/api/analytics/disease-distribution');
  return response.data.distribution.map((disease: any) => ({
    disease: disease.name,
    count: disease.value,
    percentage: disease.value,
  }));
}

export async function getRecentActivity(_userId: string, limit: number = 5): Promise<AnalysisResult[]> {
  const response = await api.get(`/api/analytics/recent-activity?limit=${limit}`);
  return response.data.activities;
}
