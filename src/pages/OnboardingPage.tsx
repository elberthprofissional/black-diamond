import { useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBarberSettings } from '../hooks/useBarberSettings';
import OnboardingWizard from '../components/Admin/OnboardingWizard';

const OnboardingPage: FC = () => {
  const navigate = useNavigate();
  const { onboardingCompleted, loading } = useBarberSettings();
  const ready = !loading;

  // Se já completou onboarding, redireciona pro dashboard
  useEffect(() => {
    if (!loading && onboardingCompleted) {
      navigate('/admin', { replace: true });
    }
  }, [loading, onboardingCompleted, navigate]);

  if (!ready || onboardingCompleted) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <OnboardingWizard
      onComplete={() => {
        // Redireciona pro dashboard após completar
        navigate('/admin', { replace: true });
      }}
    />
  );
};

export default OnboardingPage;
