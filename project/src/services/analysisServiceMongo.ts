import api from '../lib/api';

export interface AnalysisResult {
  _id: string;
  imageUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  diseaseDetected: string | null;
  confidenceScore: number | null;
  rbcCount: number | null;
  wbcCount: number | null;
  plateletCount: number | null;
  analysisNotes: string | null;
  createdAt: string;
  completedAt: string | null;
  diseaseClassifications?: DiseaseClassification[];
  cellCounts?: CellCount[];
}

export interface DiseaseClassification {
  _id: string;
  diseaseName: string;
  probability: number;
  cellAbnormalities: Record<string, unknown>;
}

export interface CellCount {
  _id: string;
  cellType: string;
  count: number;
  percentage: number;
  abnormalCount: number;
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.imageUrl;
}

export async function createAnalysis(imageFile: File, userId: string): Promise<string> {
  const imageUrl = await uploadImage(imageFile);

  const response = await api.post('/analyses', {
    imageUrl
  });

  return response.data._id;
}

export async function processAnalysis(analysisId: string): Promise<void> {
  await api.post(`/analyses/${analysisId}/process`);

  return new Promise((resolve) => {
    setTimeout(() => resolve(), 3000);
  });
}

export async function getAnalyses(userId: string): Promise<AnalysisResult[]> {
  const response = await api.get('/analyses');
  return response.data;
}

export async function getAnalysisById(analysisId: string): Promise<AnalysisResult | null> {
  try {
    const response = await api.get(`/analyses/${analysisId}`);
    return response.data;
  } catch (error) {
    return null;
  }
}

export async function deleteAnalysis(analysisId: string): Promise<void> {
  await api.delete(`/analyses/${analysisId}`);
}
