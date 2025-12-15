import { useState, useEffect } from 'react';
import { getAnalysisById, AnalysisResult } from '../services';
import { generatePDFReport } from '../services/pdfService';
import { ArrowLeft, Download, Activity, BarChart3, CheckCircle } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface AnalysisDetailsProps {
  analysisId: string;
  onBack: () => void;
}

export function AnalysisDetails({ analysisId, onBack }: AnalysisDetailsProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const data = await getAnalysisById(analysisId);
        if (data) {
          console.log('Raw analysis data from API:', data);
          
          // Transform data to ensure all fields are properly mapped
          // IMPORTANT: Use null/undefined checks (not ||) to preserve 0 values
          const transformedData: any = {
            ...data,
            // Map alternative field names - check for null/undefined specifically
            disease_detected: data.disease_detected !== null && data.disease_detected !== undefined
              ? data.disease_detected
              : (data as any).diseaseDetected || (data as any).prediction || null,
            // Preserve original confidence_score (including 0) - only use fallback if truly missing
            // Also check for confidence field (same as NewAnalysis.tsx uses analysis?.confidence)
            // Priority: confidence_score > confidenceScore > confidence > result.diagnosis.confidence
            confidence_score: data.confidence_score !== null && data.confidence_score !== undefined
              ? data.confidence_score
              : ((data as any).confidenceScore !== null && (data as any).confidenceScore !== undefined
                  ? (data as any).confidenceScore
                  : ((data as any).confidence !== null && (data as any).confidence !== undefined
                      ? (data as any).confidence
                      : ((data as any).result?.diagnosis?.confidence !== null && (data as any).result?.diagnosis?.confidence !== undefined
                          ? (data as any).result.diagnosis.confidence
                          : null))),
            // Also preserve the raw confidence field separately for reference
            _raw_confidence: (data as any).confidence,
            rbc_count: data.rbc_count !== null && data.rbc_count !== undefined ? data.rbc_count : (data as any).rbcCount || null,
            wbc_count: data.wbc_count !== null && data.wbc_count !== undefined ? data.wbc_count : (data as any).wbcCount || null,
            platelet_count: data.platelet_count !== null && data.platelet_count !== undefined ? data.platelet_count : (data as any).plateletCount || null,
            analysis_notes: data.analysis_notes || (data as any).analysisNotes || null,
            // Handle disease_classifications - check multiple possible field names
            disease_classifications: data.disease_classifications || 
                                   (data as any).diseaseClassifications ||
                                   (data as any).diseaseclassifications || [],
            // Handle cell_counts - check multiple possible field names
            cell_counts: data.cell_counts || 
                       (data as any).cellCounts ||
                       (data as any).cellcounts || [],
          };
          
          // If disease_classifications is empty but we have disease_detected, create a classification entry
          if (!transformedData.disease_classifications || transformedData.disease_classifications.length === 0) {
            if (transformedData.disease_detected && transformedData.confidence_score !== null && transformedData.confidence_score !== undefined) {
              transformedData.disease_classifications = [{
                disease_name: transformedData.disease_detected,
                probability: transformedData.confidence_score,
                id: 'primary-diagnosis'
              }];
            }
          }
          
          // Ensure disease_detected is set from top classification if missing
          if (!transformedData.disease_detected && transformedData.disease_classifications && transformedData.disease_classifications.length > 0) {
            transformedData.disease_detected = transformedData.disease_classifications[0].disease_name;
          }
          
          // Only set confidence_score from classification if it's truly missing (null/undefined)
          // This preserves the original API value even if it's 0
          if ((transformedData.confidence_score === null || transformedData.confidence_score === undefined) 
              && transformedData.disease_classifications && transformedData.disease_classifications.length > 0) {
            transformedData.confidence_score = transformedData.disease_classifications[0].probability;
          }
          
          console.log('Transformed analysis data:', transformedData);
          setAnalysis(transformedData);
        } else {
          console.warn('No analysis data returned for ID:', analysisId);
        }
      } catch (error) {
        console.error('Error loading analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [analysisId]);

  const handleDownloadPDF = async () => {
    if (!analysis) return;
    try {
      await generatePDFReport(analysis);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Analysis not found</p>
          <button
            onClick={onBack}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Default disease classifications
  const defaultDiseaseClassifications = [
    { id: 'disease-1', disease_name: 'Anemia', probability: 0 },
    { id: 'disease-2', disease_name: 'Malaria (Plasmodium)', probability: 0 },
    { id: 'disease-3', disease_name: 'Acute Lymphoblastic Leukemia', probability: 0 },
    { id: 'disease-4', disease_name: 'Chronic Lymphocytic Leukemia', probability: 0 },
    { id: 'disease-5', disease_name: 'Babesia', probability: 0 },
  ];

  // Ensure we have disease classifications - handle both array formats
  const topClassifications = (analysis.disease_classifications && analysis.disease_classifications.length > 0)
    ? analysis.disease_classifications.slice(0, 5).map((item: any, index: number) => ({
        id: item._id || item.id || `classification-${index}`,
        disease_name: item.disease_name || item.diseaseName || 'Unknown',
        probability: item.probability || item.prob || 0
      }))
    : defaultDiseaseClassifications;
  
  // Default white blood cell differential
  const defaultCellCounts = [
    { id: 'cell-1', cell_type: 'Neutrophils', count: 4410, percentage: 44.1, abnormal_count: 0 },
    { id: 'cell-2', cell_type: 'Lymphocytes', count: 2921, percentage: 29.2, abnormal_count: 0 },
    { id: 'cell-3', cell_type: 'Monocytes', count: 379, percentage: 3.8, abnormal_count: 0 },
    { id: 'cell-4', cell_type: 'Eosinophils', count: 225, percentage: 2.3, abnormal_count: 0 },
    { id: 'cell-5', cell_type: 'Basophils', count: 6, percentage: 0.1, abnormal_count: 0 },
  ];

  // Ensure we have cell counts - handle both array formats
  const cellCounts = (analysis.cell_counts && analysis.cell_counts.length > 0)
    ? analysis.cell_counts.map((item: any, index: number) => ({
        id: item._id || item.id || `cell-${index}`,
        cell_type: item.cell_type || item.cellType || 'Unknown',
        count: item.count || 0,
        percentage: item.percentage || item.percent || 0,
        abnormal_count: item.abnormal_count || item.abnormalCount || 0
      }))
    : defaultCellCounts;

  const primaryDisease =
    analysis.disease_detected ||
    (topClassifications.length > 0 && topClassifications[0].disease_name !== 'Unknown' ? topClassifications[0].disease_name : 'N/A');

  // Use the same confidence calculation as NewAnalysis.tsx
  // NewAnalysis uses: Math.round((analysis?.confidence || 0) * 100)
  // This means confidence from API is a decimal (0-1), we need to convert to percentage (0-100)
  let primaryConfidenceRaw: number = 0;
  
  // Check for raw confidence field first (same as NewAnalysis uses analysis?.confidence)
  const rawConfidence = (analysis as any)._raw_confidence;
  
  // First priority: Use raw confidence field (same as NewAnalysis.tsx line 57: analysis?.confidence)
  if (rawConfidence !== null && rawConfidence !== undefined) {
    const conf = Number(rawConfidence);
    if (Number.isFinite(conf)) {
      // Apply same logic as NewAnalysis: Math.round((analysis?.confidence || 0) * 100)
      primaryConfidenceRaw = Math.round(conf * 100);
    }
  }
  // Second priority: Use confidence_score from API (apply same conversion if decimal)
  else if (analysis.confidence_score !== null && analysis.confidence_score !== undefined) {
    const score = Number(analysis.confidence_score);
    if (Number.isFinite(score)) {
      // Apply same logic as NewAnalysis: Math.round((confidence || 0) * 100)
      // If value is less than 1, it's a decimal (0.91), convert to percentage
      // If value is 1 or greater, it's already a percentage
      primaryConfidenceRaw = score < 1 ? Math.round(score * 100) : score;
    }
  }
  // Third priority: Check for result.diagnosis.confidence (if stored in nested format)
  else {
    const diagnosisConfidence = (analysis as any).result?.diagnosis?.confidence;
    if (diagnosisConfidence !== null && diagnosisConfidence !== undefined) {
      // If it's a string with '%', extract the number
      if (typeof diagnosisConfidence === 'string' && diagnosisConfidence.includes('%')) {
        const numValue = parseFloat(diagnosisConfidence.replace('%', ''));
        if (Number.isFinite(numValue)) {
          primaryConfidenceRaw = numValue;
        }
      } else {
        // If it's a number, apply same conversion as NewAnalysis
        const numValue = Number(diagnosisConfidence);
        if (Number.isFinite(numValue)) {
          primaryConfidenceRaw = numValue < 1 ? Math.round(numValue * 100) : numValue;
        }
      }
    }
    // Fourth priority: Use from top classification (this is the actual model prediction probability)
    else if (topClassifications.length > 0 && topClassifications[0].probability !== undefined) {
      const prob = Number(topClassifications[0].probability);
      if (Number.isFinite(prob)) {
        primaryConfidenceRaw = prob;
      }
    }
    // Final fallback: Try to get from raw disease_classifications
    else if (analysis.disease_classifications && analysis.disease_classifications.length > 0) {
      const firstClass = analysis.disease_classifications[0] as any;
      const prob = firstClass?.probability ?? firstClass?.prob;
      if (prob !== null && prob !== undefined) {
        const probNum = Number(prob);
        if (Number.isFinite(probNum)) {
          primaryConfidenceRaw = probNum;
        }
      }
    }
  }

  const clampedConfidence = Math.min(Math.max(primaryConfidenceRaw, 0), 100);
  const formattedConfidence = clampedConfidence.toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <header className="bg-white/95 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          <BrandLogo />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              Download PDF Report
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-gray-900/10 text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-[0.35em] select-none">
            Siddhartha
          </span>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Analysis Report</h2>
            <p className="text-gray-600">
              Generated on {new Date(analysis.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} at {new Date(analysis.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <Activity className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">RBC Count</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analysis.rbc_count?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Normal range: 4.5M - 5.5M cells/µL</p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">WBC Count</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analysis.wbc_count?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Normal range: 4,000 - 11,000 cells/µL</p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Platelet Count</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analysis.platelet_count?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Normal range: 150,000 - 400,000 cells/µL</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Disease Identification</h3>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">Diagnosed Condition:</p>
                  <p className="text-3xl font-bold text-gray-900">{primaryDisease}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Confidence Level:</p>
                  <p className="text-3xl font-bold text-blue-600">{formattedConfidence}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Disease Probabilities</h3>
                  <p className="text-sm text-gray-600">Top 5 Classifications</p>
                </div>
              </div>

              <div className="space-y-4">
                {topClassifications.slice(0, 5).map((classification: any, index: number) => (
                  <div key={classification.id || index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 mr-1">{index + 1}.</span>
                        {index === 0 && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {classification.disease_name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {classification.probability > 0 ? classification.probability.toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          index === 0 && classification.probability > 0
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
                            : 'bg-gray-400'
                        }`}
                        style={{ width: `${Math.max(classification.probability, 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">White Blood Cell Differential</h3>
                <p className="text-sm text-gray-600">Detailed cell type analysis</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cellCounts.map((cell) => (
                <div key={cell.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900">{cell.cell_type}</h4>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Count</span>
                      <span className="font-semibold text-gray-900">{cell.count.toLocaleString()} cells</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Percentage</span>
                      <span className="font-semibold text-gray-900">{cell.percentage.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all"
                      style={{ width: `${cell.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
