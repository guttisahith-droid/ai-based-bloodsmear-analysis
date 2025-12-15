import Analysis from '../models/Analysis.js';
import DiseaseClassification from '../models/DiseaseClassification.js';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const allAnalyses = await Analysis.find({
      userId,
      status: 'completed'
    });

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const thisMonthAnalyses = await Analysis.countDocuments({
      userId,
      createdAt: { $gte: thisMonthStart }
    });

    const totalAnalyses = allAnalyses.length;

    const averageConfidence = totalAnalyses > 0
      ? allAnalyses.reduce((sum, a) => sum + (a.confidenceScore || 0), 0) / totalAnalyses
      : 0;

    const positiveDetections = allAnalyses.filter(
      a => a.diseaseDetected && a.diseaseDetected !== 'Normal'
    ).length;

    const positiveDetectionRate = totalAnalyses > 0
      ? (positiveDetections / totalAnalyses) * 100
      : 0;

    res.json({
      totalAnalyses,
      thisMonthAnalyses,
      averageConfidence: Math.round(averageConfidence * 10) / 10,
      positiveDetectionRate: Math.round(positiveDetectionRate * 10) / 10
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMonthlyData = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const analyses = await Analysis.find({
      userId: req.user._id,
      createdAt: { $gte: sixMonthsAgo }
    }).sort({ createdAt: 1 });

    const monthCounts = new Map();

    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthCounts.set(monthKey, 0);
    }

    analyses.forEach(analysis => {
      const monthKey = new Date(analysis.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });
      if (monthCounts.has(monthKey)) {
        monthCounts.set(monthKey, monthCounts.get(monthKey) + 1);
      }
    });

    const result = Array.from(monthCounts.entries()).map(([month, count]) => ({
      month,
      count
    }));

    res.json(result);
  } catch (error) {
    console.error('Get monthly data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDiseaseDistribution = async (req, res) => {
  try {
    const analyses = await Analysis.find({
      userId: req.user._id,
      status: 'completed',
      diseaseDetected: { $ne: null }
    });

    if (analyses.length === 0) {
      return res.json([]);
    }

    const diseaseCounts = new Map();
    analyses.forEach(analysis => {
      const disease = analysis.diseaseDetected || 'Unknown';
      diseaseCounts.set(disease, (diseaseCounts.get(disease) || 0) + 1);
    });

    const total = analyses.length;

    const result = Array.from(diseaseCounts.entries())
      .map(([disease, count]) => ({
        disease,
        count,
        percentage: Math.round((count / total) * 100 * 10) / 10
      }))
      .sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (error) {
    console.error('Get disease distribution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const analyses = await Analysis.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(analyses);
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
