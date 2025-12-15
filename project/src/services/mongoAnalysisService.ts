import api from '../lib/api';

// Define the frontend-facing interface
export interface AnalysisResult {
  _id: string;
  user_id: string;
  image_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  disease_detected: string | null;
  confidence_score: number | null;
  rbc_count: number | null;
  wbc_count: number | null;
  platelet_count: number | null;
  analysis_notes: string | null;
  created_at: string;
  completed_at: string | null;
  disease_classifications?: Array<{
    disease_name: string;
    probability: number;
  }>;
  cell_counts?: Array<{
    cell_type: string;
    count: number;
  }>;
}

export async function createAnalysis(_userId: string, file: File): Promise<{ analysis_id: string; analysis: any }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/api/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
}

export async function getAnalyses(_userId: string): Promise<AnalysisResult[]> {
  const response = await api.get('/api/analyses');
  return response.data.analyses;
}

export async function getAnalysisById(analysisId: string): Promise<AnalysisResult | null> {
  try {
    const response = await api.get(`/api/analyses/${analysisId}`);
    return response.data.analysis;
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return null;
  }
}

export async function updateAnalysis(
  analysisId: string, 
  updates: Partial<AnalysisResult>
): Promise<void> {
  await api.put(`/api/analyses/${analysisId}`, updates);
}

export async function deleteAnalysis(analysisId: string): Promise<void> {
  await api.delete(`/api/analyses/${analysisId}`);
}

export async function processAnalysis(analysisId: string): Promise<void> {
  // This would be handled by the backend
  await api.post(`/api/analyses/${analysisId}/process`);
}

// All database operations are now handled by the backend API
