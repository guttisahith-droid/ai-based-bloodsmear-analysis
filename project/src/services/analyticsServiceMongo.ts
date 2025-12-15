import api from '../lib/api';
import { AnalysisResult } from './analysisServiceMongo';

export interface DashboardStats {
  totalAnalyses: number;
  thisMonthAnalyses: number;
  averageConfidence: number;
  positiveDetectionRate: number;
}

export interface MonthlyData {
  month: string;
  count: number;
}

export interface DiseaseDistribution {
  disease: string;
  count: number;
  percentage: number;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const response = await api.get('/analytics/dashboard-stats');
  return response.data;
}

export async function getMonthlyAnalysisData(userId: string): Promise<MonthlyData[]> {
  const response = await api.get('/analytics/monthly-data');
  return response.data;
}

export async function getDiseaseDistribution(userId: string): Promise<DiseaseDistribution[]> {
  const response = await api.get('/analytics/disease-distribution');
  return response.data;
}

export async function getRecentActivity(userId: string, limit: number = 5): Promise<AnalysisResult[]> {
  const response = await api.get(`/analytics/recent-activity?limit=${limit}`);
  return response.data;
}
