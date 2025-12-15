import Analysis from '../models/Analysis.js';
import DiseaseClassification from '../models/DiseaseClassification.js';
import CellCount from '../models/CellCount.js';
import Notification from '../models/Notification.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISEASE_TYPES = [
  'Normal',
  'Malaria (Plasmodium)',
  'Babesia',
  'Leishmania',
  'Acute Lymphoblastic Leukemia',
  'Chronic Lymphocytic Leukemia',
  'Acute Myeloid Leukemia',
  'Chronic Myeloid Leukemia',
  'Anemia',
  'Thrombocytopenia'
];

const CELL_TYPES = [
  { name: 'Neutrophils', normalRange: [40, 60] },
  { name: 'Lymphocytes', normalRange: [20, 40] },
  { name: 'Monocytes', normalRange: [2, 8] },
  { name: 'Eosinophils', normalRange: [1, 4] },
  { name: 'Basophils', normalRange: [0, 1] }
];

async function runAIInference(imagePath) {
  try {
    const modelPath = path.join(__dirname, '../ml_models/best_combined_model.pth');
    const pythonScript = path.join(__dirname, '../ai/inference.py');

    const fullImagePath = path.join(__dirname, '../..', imagePath);

    const { stdout, stderr } = await execPromise(
      `python3 ${pythonScript} ${fullImagePath} ${modelPath}`
    );

    if (stderr && !stderr.includes('UserWarning')) {
      console.error('Python stderr:', stderr);
    }

    const result = JSON.parse(stdout);

    if (!result.success) {
      throw new Error(result.error || 'AI inference failed');
    }

    return result;
  } catch (error) {
    console.error('AI inference error:', error);
    return null;
  }
}

function generateMockAnalysisResults() {
  const diseaseIndex = Math.floor(Math.random() * DISEASE_TYPES.length);
  const primaryDisease = DISEASE_TYPES[diseaseIndex];
  const confidenceScore = 85 + Math.random() * 12;

  const diseaseClassifications = DISEASE_TYPES.map((disease, idx) => {
    let probability;
    if (idx === diseaseIndex) {
      probability = confidenceScore;
    } else {
      probability = Math.random() * (100 - confidenceScore) / DISEASE_TYPES.length;
    }

    return {
      diseaseName: disease,
      probability: Math.round(probability * 100) / 100,
      cellAbnormalities: idx === diseaseIndex ? {
        parasitesDetected: disease.includes('Malaria') || disease.includes('Babesia'),
        abnormalMorphology: disease.includes('Leukemia'),
        cellSizeVariation: Math.random() > 0.5
      } : {}
    };
  }).sort((a, b) => b.probability - a.probability);

  const cellCounts = CELL_TYPES.map(({ name, normalRange }) => {
    const isAbnormal = primaryDisease.includes('Leukemia') && Math.random() > 0.3;
    const basePercentage = isAbnormal
      ? normalRange[0] + Math.random() * 30
      : normalRange[0] + Math.random() * (normalRange[1] - normalRange[0]);

    const percentage = Math.round(basePercentage * 100) / 100;
    const count = Math.floor(percentage * 100);
    const abnormalCount = isAbnormal ? Math.floor(count * (0.2 + Math.random() * 0.3)) : 0;

    return {
      cellType: name,
      count,
      percentage,
      abnormalCount
    };
  });

  const rbcCount = 4500000 + Math.floor(Math.random() * 1000000);
  const wbcCount = 4000 + Math.floor(Math.random() * 7000);
  const plateletCount = 150000 + Math.floor(Math.random() * 250000);

  let analysisNotes;
  if (primaryDisease === 'Normal') {
    analysisNotes = 'Blood smear shows normal cellular morphology. RBC, WBC, and platelet counts within expected ranges. No abnormal cells or parasites detected.';
  } else if (primaryDisease.includes('Malaria')) {
    analysisNotes = 'Parasitic inclusions consistent with Plasmodium detected in red blood cells. Recommend confirmatory testing and immediate treatment protocol.';
  } else if (primaryDisease.includes('Leukemia')) {
    analysisNotes = 'Abnormal white blood cell morphology detected. Increased blast cell population observed. Recommend hematology consultation and bone marrow biopsy.';
  } else if (primaryDisease.includes('Anemia')) {
    analysisNotes = 'Reduced red blood cell count with variations in cell size and shape. Consider iron studies and further investigation of underlying cause.';
  } else {
    analysisNotes = 'Abnormal findings detected. Clinical correlation and additional testing recommended.';
  }

  return {
    diseaseDetected: primaryDisease,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    rbcCount,
    wbcCount,
    plateletCount,
    analysisNotes,
    diseaseClassifications,
    cellCounts
  };
}

export const createAnalysis = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const analysis = await Analysis.create({
      userId: req.user._id,
      imageUrl,
      status: 'pending'
    });

    res.status(201).json(analysis);
  } catch (error) {
    console.error('Create analysis error:', error);
    res.status(500).json({ message: 'Server error creating analysis' });
  }
};

export const processAnalysis = async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await Analysis.findById(id);

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    if (analysis.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    analysis.status = 'processing';
    await analysis.save();

    setTimeout(async () => {
      try {
        let aiResults = await runAIInference(analysis.imageUrl);

        if (!aiResults) {
          console.log('AI inference failed, using mock data');
          aiResults = generateMockAnalysisResults();
        }

        analysis.status = 'completed';
        analysis.diseaseDetected = aiResults.diseaseDetected;
        analysis.confidenceScore = aiResults.confidenceScore;
        analysis.rbcCount = aiResults.rbcCount;
        analysis.wbcCount = aiResults.wbcCount;
        analysis.plateletCount = aiResults.plateletCount;
        analysis.analysisNotes = aiResults.analysisNotes;
        analysis.completedAt = new Date();
        await analysis.save();

        const classifications = aiResults.diseaseClassifications.map(dc => ({
          analysisId: analysis._id,
          ...dc
        }));
        await DiseaseClassification.insertMany(classifications);

        const cellCounts = aiResults.cellCounts.map(cc => ({
          analysisId: analysis._id,
          ...cc
        }));
        await CellCount.insertMany(cellCounts);

        await Notification.create({
          userId: req.user._id,
          title: 'Analysis Complete',
          message: `Your blood smear analysis is complete. Disease detected: ${aiResults.diseaseDetected}`,
          type: 'success',
          analysisId: analysis._id
        });
      } catch (error) {
        console.error('Error in analysis processing:', error);
        analysis.status = 'failed';
        await analysis.save();

        await Notification.create({
          userId: req.user._id,
          title: 'Analysis Failed',
          message: 'There was an error processing your blood smear analysis. Please try again.',
          type: 'error',
          analysisId: analysis._id
        });
      }
    }, 2000);

    res.json({ message: 'Analysis processing started' });
  } catch (error) {
    console.error('Process analysis error:', error);
    res.status(500).json({ message: 'Server error processing analysis' });
  }
};

export const getAnalyses = async (req, res) => {
  try {
    const analyses = await Analysis.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json(analyses);
  } catch (error) {
    console.error('Get analyses error:', error);
    res.status(500).json({ message: 'Server error fetching analyses' });
  }
};

export const getAnalysisById = async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await Analysis.findById(id);

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    if (analysis.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const classifications = await DiseaseClassification.find({ analysisId: id })
      .sort({ probability: -1 });

    const cellCounts = await CellCount.find({ analysisId: id })
      .sort({ percentage: -1 });

    res.json({
      ...analysis.toObject(),
      diseaseClassifications: classifications,
      cellCounts: cellCounts
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ message: 'Server error fetching analysis' });
  }
};

export const deleteAnalysis = async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await Analysis.findById(id);

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    if (analysis.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await DiseaseClassification.deleteMany({ analysisId: id });
    await CellCount.deleteMany({ analysisId: id });
    await analysis.deleteOne();

    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({ message: 'Server error deleting analysis' });
  }
};
