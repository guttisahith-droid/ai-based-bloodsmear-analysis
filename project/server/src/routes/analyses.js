import express from 'express';
import {
  createAnalysis,
  processAnalysis,
  getAnalyses,
  getAnalysisById,
  deleteAnalysis
} from '../controllers/analysisController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createAnalysis);
router.post('/:id/process', processAnalysis);
router.get('/', getAnalyses);
router.get('/:id', getAnalysisById);
router.delete('/:id', deleteAnalysis);

export default router;
