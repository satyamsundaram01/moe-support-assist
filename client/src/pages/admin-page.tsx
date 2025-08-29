import React from 'react';
import { AdminDashboard } from '../components/admin/admin-dashboard';
import { useAuthUser } from '../store/auth-store';

export const AdminPage: React.FC = () => {
  const user = useAuthUser();
  const isAllowed = user?.email === 'pavan.patchikarla@moengage.com';

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">403 - Forbidden</div>
          <div className="text-gray-600 dark:text-gray-400">You do not have access to the admin dashboard.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminDashboard />
    </div>
  );
};
