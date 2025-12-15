import api from '../lib/api';

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  analysisId: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const response = await api.get('/notifications');
  return response.data;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const response = await api.get('/notifications/unread-count');
  return response.data.count;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await api.patch(`/notifications/${notificationId}/read`);
}

export async function markAllAsRead(userId: string): Promise<void> {
  await api.patch('/notifications/read-all');
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'info',
  analysisId?: string
): Promise<void> {
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await api.delete(`/notifications/${notificationId}`);
}
