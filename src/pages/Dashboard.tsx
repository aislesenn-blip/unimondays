import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    switch (user.role) {
      case 'HOD':
        navigate('/dashboard/hod');
        break;
      case 'SECRETARY':
        navigate('/dashboard/secretary');
        break;
      case 'STAFF':
        navigate('/dashboard/staff');
        break;
      case 'COMMITTEE':
        navigate('/dashboard/committee');
        break;
      default:
        navigate('/dashboard/staff');
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
    </div>
  );
};
