import { getDb } from '../lib/mongo';
import { format, subMonths, startOfMonth } from 'date-fns';

interface DashboardStats {
  totalAnalyses: number;
  analysesThisMonth: number;
  averageConfidence: number;
  mostCommonDisease: string | null;
  diseaseDistribution: Record<string, number>;
}

interface MonthlyData {
  month: string;
  count: number;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const db = await getDb();
  
  // Get total analyses count
  const totalAnalyses = await db.collection('analyses')
    .countDocuments({ user_id: userId });
  
  // Get this month's analyses count
  const thisMonthStart = startOfMonth(new Date());
  const thisMonthAnalyses = await db.collection('analyses')
    .countDocuments({
      user_id: userId,
      created_at: { $gte: thisMonthStart }
    });
  
  // Get average confidence score
  const avgResult = await db.collection('analyses').aggregate([
    { $match: { 
      user_id: userId,
      confidence_score: { $ne: null }
    }},
    { $group: {
      _id: null,
      averageConfidence: { $avg: '$confidence_score' }
    }}
  ]).toArray();
  
  const averageConfidence = avgResult[0]?.averageConfidence || 0;
  
  // Get most common disease
  const diseaseResult = await db.collection('analyses').aggregate([
    { $match: { 
      user_id: userId,
      disease_detected: { $ne: null }
    }},
    { $group: {
      _id: '$disease_detected',
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]).toArray();
  
  const mostCommonDisease = diseaseResult[0]?._id || null;
  
  // Get disease distribution
  const diseaseDistribution = await db.collection<{ disease_detected: string }>('analyses').aggregate([
    { $match: { 
      user_id: userId,
      disease_detected: { $ne: null }
    }},
    { $group: {
      _id: '$disease_detected',
      count: { $sum: 1 }
    }}
  ]).toArray();
  
  const distribution: Record<string, number> = {};
  diseaseDistribution.forEach(item => {
    distribution[item._id] = item.count;
  });
  
  return {
    totalAnalyses,
    analysesThisMonth: thisMonthAnalyses,
    averageConfidence: parseFloat(averageConfidence.toFixed(2)),
    mostCommonDisease,
    diseaseDistribution: distribution
  };
}

export async function getMonthlyAnalysisData(userId: string): Promise<MonthlyData[]> {
  const db = await getDb();
  const sixMonthsAgo = subMonths(new Date(), 6);
  
  const result = await db.collection<{ created_at: Date }>('analyses').aggregate([
    { $match: {
      user_id: userId,
      created_at: { $gte: sixMonthsAgo }
    }},
    { $group: {
      _id: {
        year: { $year: '$created_at' },
        month: { $month: '$created_at' }
      },
      count: { $sum: 1 }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]).toArray();
  
  // Format the result
  return result.map(item => ({
    month: format(new Date(item._id.year, item._id.month - 1), 'MMM yyyy'),
    count: item.count
  }));
}

export async function getRecentActivity(userId: string, limit: number = 5): Promise<any[]> {
  const db = await getDb();
  return db.collection('analyses')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}
