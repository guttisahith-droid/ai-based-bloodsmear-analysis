import api from '../lib/api';

export interface Notification {
  _id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
  analysis_id?: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const response = await api.get(`/api/notifications`);
  return response.data.notifications;
}

export async function getUnreadCount(): Promise<number> {
  const response = await api.get('/api/notifications/unread-count');
  return response.data.count;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await api.patch(`/api/notifications/${notificationId}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await api.patch('/api/notifications/mark-all-read');
}

export async function createNotification(
  title: string,
  message: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'info',
  analysisId?: string
): Promise<void> {
  await api.post('/api/notifications', {
    title,
    message,
    type,
    analysis_id: analysisId
  });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await api.delete(`/api/notifications/${notificationId}`);
}
