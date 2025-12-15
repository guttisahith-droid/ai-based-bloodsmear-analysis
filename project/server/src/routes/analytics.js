import express from 'express';
import {
  getDashboardStats,
  getMonthlyData,
  getDiseaseDistribution,
  getRecentActivity
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard-stats', getDashboardStats);
router.get('/monthly-data', getMonthlyData);
router.get('/disease-distribution', getDiseaseDistribution);
router.get('/recent-activity', getRecentActivity);

export default router;
