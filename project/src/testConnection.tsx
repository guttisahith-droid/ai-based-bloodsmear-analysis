import { useEffect, useState } from 'react';
import api from './lib/api';

const TestConnection = () => {
  const [status, setStatus] = useState('Testing...');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test health check
        const healthRes = await api.get('/api/health');
        setStatus(prev => prev + '\n✅ Backend is running: ' + JSON.stringify(healthRes.data));

        // Test authentication
        try {
          const authRes = await api.get('/api/me', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          setStatus(prev => prev + '\n✅ User is authenticated: ' + JSON.stringify(authRes.data));
        } catch (error: any) {
          setStatus(prev => prev + '\nℹ️ Not authenticated: ' + (error?.message || 'Unknown error'));
        }

      } catch (error: any) {
        setStatus('❌ Backend connection failed: ' + (error?.message || 'Unknown error'));
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
      <h2>Connection Test</h2>
      <div>{status}</div>
    </div>
  );
};

export default TestConnection;
