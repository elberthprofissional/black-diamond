import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModalA11y } from '../../../hooks/useModalA11y';
import type { BookingWithClient, Service } from '../../../types';

interface ThankYouModalProps {
  booking: BookingWithClient | null;
  services: Service[];
  onConfirm: () => void;
  onCancel: () => void;
}

const ThankYouModal: React.FC<ThankYouModalProps> = ({
  booking,
  services,
  onConfirm,
  onCancel,
}) => {
  const { dialogRef } = useModalA11y(!!booking, onCancel);

  const clientName = booking?.clients?.name || 'Cliente';
  const firstName = clientName.split(' ')[0];

  const serviceNames = (booking?.service_ids || [])
    .map((id) => services.find((s) => s.id === id)?.name)
    .filter(Boolean);
  const serviceText = serviceNames.length > 0 ? serviceNames.join(' + ') : 'servico';

  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const reviewUrl = booking?.id ? `${siteUrl}/avaliar/${booking.id}` : '';

  return (
    <AnimatePresence>
      {booking && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Enviar agradecimento"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-[320px] bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden"
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Atendimento concluido!</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Enviar agradecimento para{' '}
                  <span className="text-[#C5A059] font-semibold">{firstName}</span> com link de
                  avaliacao?
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-left">
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-1.5">
                  Mensagem:
                </p>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Oi {firstName}, obrigado por cortar com a gente! Servico: {serviceText}.
                  {reviewUrl && (
                    <>
                      <br />
                      <span className="text-[#C5A059] break-all">{reviewUrl}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col border-t border-white/[0.04]">
              <button
                onClick={onConfirm}
                className="w-full py-3.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider hover:bg-emerald-500/10 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-emerald-400"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enviar agradecimento
              </button>
              <div className="mx-6 h-px bg-white/[0.04]" />
              <button
                onClick={onCancel}
                className="w-full py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
              >
                Agora nao
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ThankYouModal;
