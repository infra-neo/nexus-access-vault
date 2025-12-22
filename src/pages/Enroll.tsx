import { useNavigate } from 'react-router-dom';
import { EnrollmentWizard } from '@/components/enrollment/EnrollmentWizard';
import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';

export default function Enroll() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <EnrollmentWizard
      onComplete={() => navigate('/my-devices')}
      onCancel={() => navigate('/my-devices')}
    />
  );
}
