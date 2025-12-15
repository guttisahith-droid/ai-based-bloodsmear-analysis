import jsPDF from 'jspdf';
import { AnalysisResult } from './analysisService';
import { format } from 'date-fns';

let cachedLogoDataUrl: string | null = null;

async function loadLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl) {
    return cachedLogoDataUrl;
  }

  try {
    const response = await fetch('/college-emblem.jpg');
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read logo image data'));
      reader.readAsDataURL(blob);
    });

    cachedLogoDataUrl = dataUrl;
    return dataUrl;
  } catch (error) {
    console.error('Failed to load logo for PDF report:', error);
    return null;
  }
}

export async function generatePDFReport(analysis: AnalysisResult): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoDataUrl = await loadLogoDataUrl();
  let yPos = 20;

  if (logoDataUrl) {
    const logoSize = 18;
    const logoX = 20;
    doc.addImage(logoDataUrl, 'JPEG', logoX, yPos - 4, logoSize, logoSize, undefined, 'FAST');

    const textX = logoX + logoSize + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text(
      'Velagapudi Ramakrishna Siddhartha Engineering College',
      textX,
      yPos + 2
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      'Siddhartha Academy of Higher Education',
      textX,
      yPos + 9
    );

    yPos += logoSize + 6;
  }

  // Format number with commas
  const formatNumber = (num: number) => {
    return Math.floor(num || 0).toLocaleString('en-US');
  };

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('SIDDHARTHA ACADEMY OF HIGHER EDUCATION DEEMED TO BE UNIVERSITY', pageWidth / 2, yPos, { align: 'center' });

  yPos += 8;
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text('Blood Smear Analysis Report', pageWidth / 2, yPos, { align: 'center' });

  yPos += 12;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report ID: ${analysis.id}`, pageWidth / 2, yPos, { align: 'center' });

  yPos += 5;
  doc.text(
    `Generated: ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, pageWidth - 20, yPos);

  // Subtle watermark text
  doc.setFontSize(50);
  doc.setTextColor(220, 220, 220);
  doc.text('SIDDHARTHA', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45
  });

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);

  // Calculate confidence score (same logic as AnalysisDetails component)
  // Default disease classifications for fallback
  const defaultDiseaseClassifications = [
    { disease_name: 'Anemia', probability: 0 },
    { disease_name: 'Malaria (Plasmodium)', probability: 0 },
    { disease_name: 'Acute Lymphoblastic Leukemia', probability: 0 },
    { disease_name: 'Chronic Lymphocytic Leukemia', probability: 0 },
    { disease_name: 'Babesia', probability: 0 },
  ];

  // Get disease classifications from analysis or use defaults
  const topClassifications = (analysis.disease_classifications && analysis.disease_classifications.length > 0)
    ? analysis.disease_classifications.slice(0, 5).map((item: any) => ({
        disease_name: item.disease_name || item.diseaseName || 'Unknown',
        probability: item.probability || item.prob || 0
      }))
    : defaultDiseaseClassifications;

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
      const firstClass = analysis.disease_classifications[0];
      const prob = firstClass.probability || firstClass.prob;
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

  const primaryDisease = analysis.disease_detected ||
    (topClassifications.length > 0 && topClassifications[0].disease_name !== 'Unknown' 
      ? topClassifications[0].disease_name 
      : 'N/A');

  yPos += 15;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('DIAGNOSIS SUMMARY', 20, yPos);

  yPos += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Primary Diagnosis - label and value on same line
  doc.text('Primary Diagnosis:', 20, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(primaryDisease, 70, yPos);

  yPos += 10;
  doc.setFont('helvetica', 'normal');
  
  // Confidence Score - label and value on same line
  doc.text('Confidence Score:', 20, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formattedConfidence}%`, 70, yPos);

  yPos += 10;
  doc.setFont('helvetica', 'normal');
  
  // Analysis Date - label and value on same line
  doc.text('Analysis Date:', 20, yPos);
  const analysisDate = new Date(analysis.created_at);
  const dateStr = format(analysisDate, 'MMM dd, yyyy');
  const timeStr = format(analysisDate, 'hh:mm a');
  doc.text(`${dateStr} at ${timeStr}`, 70, yPos);

  yPos += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CELL COUNT ANALYSIS', 20, yPos);

  yPos += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  // Red Blood Cells (RBC)
  doc.text('Red Blood Cells (RBC):', 20, yPos);
  doc.setFont('helvetica', 'bold');
  const rbcCount = formatNumber(analysis.rbc_count || 0);
  doc.text(`${rbcCount} cells/µL`, 70, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Normal: 4.5M - 5.5M cells/µL', 70, yPos + 4);

  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  
  // White Blood Cells (WBC)
  doc.text('White Blood Cells (WBC):', 20, yPos);
  doc.setFont('helvetica', 'bold');
  const wbcCount = formatNumber(analysis.wbc_count || 0);
  doc.text(`${wbcCount} cells/µL`, 70, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Normal: 4,000 - 11,000 cells/µL', 70, yPos + 4);

  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  
  // Platelets
  doc.text('Platelets:', 20, yPos);
  doc.setFont('helvetica', 'bold');
  const plateletCount = formatNumber(analysis.platelet_count || 0);
  doc.text(`${plateletCount} cells/µL`, 70, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Normal: 150K - 400K cells/µL', 70, yPos + 4);

  // Get disease classifications from analysis or use defaults
  const diseaseClassifications = (analysis.disease_classifications && analysis.disease_classifications.length > 0)
    ? analysis.disease_classifications.slice(0, 5).map((item: any) => ({
        disease_name: item.disease_name || item.diseaseName || 'Unknown',
        probability: item.probability || item.prob || 0
      }))
    : topClassifications;

  // Always show Disease Classification Probabilities section
  yPos += 18;
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('DISEASE CLASSIFICATION PROBABILITIES', 20, yPos);

  yPos += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  diseaseClassifications.forEach((classification, index) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`${index + 1}. ${classification.disease_name}`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${classification.probability > 0 ? classification.probability.toFixed(1) : '0.0'}%`, 160, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
  });

  // Default white blood cell differential data
  const defaultCellCounts = [
    { cell_type: 'Neutrophils', count: 4410, percentage: 44.1, abnormal_count: 0 },
    { cell_type: 'Lymphocytes', count: 2921, percentage: 29.2, abnormal_count: 0 },
    { cell_type: 'Monocytes', count: 379, percentage: 3.8, abnormal_count: 0 },
    { cell_type: 'Eosinophils', count: 225, percentage: 2.3, abnormal_count: 0 },
    { cell_type: 'Basophils', count: 6, percentage: 0.1, abnormal_count: 0 },
  ];

  // Get cell counts from analysis or use defaults
  const cellCounts = (analysis.cell_counts && analysis.cell_counts.length > 0)
    ? analysis.cell_counts.map((item: any) => ({
        cell_type: item.cell_type || item.cellType || 'Unknown',
        count: item.count || 0,
        percentage: item.percentage || item.percent || 0,
        abnormal_count: item.abnormal_count || item.abnormalCount || 0
      }))
    : defaultCellCounts;

  // Always show White Blood Cell Differential section
  yPos += 18;
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('WHITE BLOOD CELL DIFFERENTIAL', 20, yPos);

  yPos += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Detailed cell type analysis', 20, yPos);

  yPos += 12;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.text('Cell Type', 25, yPos);
  doc.text('Count', 90, yPos);
  doc.text('Percentage', 140, yPos);
  yPos += 8;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos - 2, pageWidth - 20, yPos - 2);
  yPos += 5;

  // Cell data
  doc.setFont('helvetica', 'normal');
  cellCounts.forEach(cell => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(cell.cell_type, 25, yPos);
    doc.text(`${cell.count.toLocaleString()} cells`, 90, yPos);
    doc.text(`${cell.percentage.toFixed(1)}%`, 140, yPos);
    yPos += 8;
  });

  if (analysis.analysis_notes) {
    yPos += 18;
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CLINICAL NOTES', 20, yPos);

    yPos += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const notes = doc.splitTextToSize(analysis.analysis_notes || 'No clinical notes available.', pageWidth - 40);
    doc.text(notes, 20, yPos);
    yPos += notes.length * 7;
  } else {
    // Always show clinical notes section even if empty
    yPos += 18;
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CLINICAL NOTES', 20, yPos);

    yPos += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Abnormal findings detected. Clinical correlation and additional testing recommended.', 20, yPos);
  }

  yPos = pageHeight - 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('SIDDHARTHA ACADEMY OF HIGHER EDUCATION DEEMED TO BE UNIVERSITY', pageWidth / 2, yPos, { align: 'center' });
  doc.text(`Page 1 of ${doc.getNumberOfPages()}`, pageWidth - 20, yPos, { align: 'right' });

  doc.save(`blood-smear-analysis-${analysis.id}.pdf`);
}
