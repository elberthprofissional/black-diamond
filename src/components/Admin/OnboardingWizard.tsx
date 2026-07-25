import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, ArrowLeft, Scissors, Camera, Clock, User } from 'lucide-react';
import { useBarberSettings } from '../../hooks/useBarberSettings';
import { useToast } from '../../hooks/useToast';
import ToastNotification from '../Admin/shared/ToastNotification';
import { logError } from '../../lib/logger';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: FC<{ className?: string }>;
  action: () => Promise<boolean>;
}

const OnboardingWizard: FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState<number | null>(null);
  const { toast, showError } = useToast();
  const { updateBarberName, updateBarberBio, updateBarberPhone } = useBarberSettings();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  const steps: OnboardingStep[] = [
    {
      id: 'name',
      title: 'Qual seu nome?',
      description: 'Como você quer aparecer para seus clientes no site.',
      icon: User,
      action: async () => {
        if (!name.trim() || name.trim().length < 2) {
          showError('Digite um nome válido (mínimo 2 caracteres).');
          return false;
        }
        return updateBarberName(name.trim());
      },
    },
    {
      id: 'phone',
      title: 'Qual seu WhatsApp?',
      description: 'Seus clientes vão usar esse número para contato e confirmações.',
      icon: Scissors,
      action: async () => {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) {
          showError('Digite um telefone válido com DDD.');
          return false;
        }
        return updateBarberPhone(digits);
      },
    },
    {
      id: 'bio',
      title: 'Fale sobre você',
      description: 'Uma breve apresentação para aparecer na seção "Sobre" do site.',
      icon: Camera,
      action: async () => {
        return updateBarberBio(bio.trim() || 'Barbeiro profissional');
      },
    },
    {
      id: 'finish',
      title: 'Tudo pronto!',
      description:
        'Configuração inicial concluída. Você pode ajustar tudo depois nas configurações.',
      icon: Clock,
      action: async () => {
        onComplete();
        return true;
      },
    },
  ];

  const CurrentIcon = steps[step]?.icon ?? User;

  const handleNext = async () => {
    setLoading(step);
    try {
      const currentStep = steps[step];
      if (!currentStep) return;
      const success = await currentStep.action();
      if (success) {
        if (step < steps.length - 1) {
          setStep((s) => s + 1);
        }
      }
    } catch (e) {
      logError(e);
      showError('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="w-full max-w-[480px]">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-12">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-[#D4AF37]' : 'bg-white/[0.06]'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Icon & Title */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto">
                <CurrentIcon className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <h1 className="text-2xl font-bold text-white">{steps[step]?.title}</h1>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-sm mx-auto">
                {steps[step]?.description}
              </p>
            </div>

            {/* Step content */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-4">
              {step === 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Seu nome
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Tato"
                    maxLength={20}
                    autoFocus
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[16px] text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600"
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                  <p className="text-[10px] text-zinc-600">
                    Máximo 20 caracteres. Aparecerá no site e nos agendamentos.
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(31) 99999-9999"
                    maxLength={15}
                    autoFocus
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[16px] text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600 tabular-nums"
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                  <p className="text-[10px] text-zinc-600">
                    Os clientes vão usar esse número para entrar em contato.
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Bio (opcional)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Ex: Barbeiro há 10 anos, especialista em cortes degradê..."
                    maxLength={200}
                    rows={4}
                    autoFocus
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5 text-[16px] text-white outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-600 resize-none"
                  />
                  <p className="text-[10px] text-zinc-600">
                    Máximo 200 caracteres. Aparecerá na seção "Sobre Mim" do site.
                  </p>
                </div>
              )}

              {step === 3 && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <Check className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-white font-medium">Você já pode começar!</p>
                    <p className="text-zinc-500 text-sm">
                      Depois você pode ajustar fotos, horários, serviços e muito mais nas
                      configurações.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => step > 0 && setStep((s) => s - 1)}
                className={`flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer ${
                  step === 0 ? 'invisible' : ''
                }`}
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <button
                onClick={handleNext}
                disabled={loading !== null}
                className="btn-gold flex items-center gap-2 px-6 py-3 text-xs disabled:opacity-50"
              >
                {loading === step ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Salvando...
                  </span>
                ) : step === steps.length - 1 ? (
                  <span className="flex items-center gap-2">
                    Finalizar
                    <Check size={16} />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Continuar
                    <ChevronRight size={16} />
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <ToastNotification toast={toast} />
    </div>
  );
};

export default OnboardingWizard;
