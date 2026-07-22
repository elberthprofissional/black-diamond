import { useState, useEffect, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, ExternalLink } from 'lucide-react';
import { getGooglePlaceId, getGoogleReviewUrl } from '../lib/google-reviews';
import { GoogleIcon } from './GoogleReviewBadge';

interface ReviewRequestModalProps {
  open: boolean;
  onClose: () => void;
  clientName?: string;
}

/** Rating stars selector for quick feedback */
const RatingStars: FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex gap-1.5 justify-center">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        onClick={() => onChange(star)}
        className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
        aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
      >
        <Star
          size={28}
          className={`transition-colors ${
            star <= value ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-zinc-700'
          }`}
        />
      </button>
    ))}
  </div>
);

const ReviewRequestModal: FC<ReviewRequestModalProps> = ({ open, onClose, clientName }) => {
  const [rating, setRating] = useState(0);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (open) {
      getGooglePlaceId().then(setPlaceId);
    }
  }, [open]);

  const handleOpenGoogle = () => {
    if (placeId) {
      window.open(getGoogleReviewUrl(placeId), '_blank', 'noopener,noreferrer');
    }
    setSubmitted(true);
  };

  const handleClose = () => {
    setRating(0);
    setSubmitted(false);
    setDismissed(false);
    onClose();
  };

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(handleClose, 300);
  };

  // If rating is low (1-2), just thank and close without opening Google
  const handleRate = (value: number) => {
    setRating(value);
    if (value <= 2) {
      // Low rating — just close, don't ask for Google review
      setTimeout(handleClose, 800);
    }
  };

  if (!placeId) return null;

  const firstName = clientName?.split(' ')[0] || 'voce';

  return (
    <AnimatePresence>
      {open && !dismissed && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-[340px] bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/[0.06] text-zinc-500 hover:text-white transition-colors cursor-pointer z-10"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>

            {!submitted ? (
              <>
                {/* Header */}
                <div className="px-6 pt-6 pb-2 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto mb-4">
                    <Star size={24} className="text-[#D4AF37]" />
                  </div>
                  <h3 className="text-[15px] font-bold text-white">
                    {rating <= 2 ? 'Nos deu uma nota!' : `Ola, ${firstName}!`}
                  </h3>
                  <p className="text-[12px] text-zinc-500 mt-1.5 leading-relaxed">
                    {rating <= 2
                      ? 'Obrigado pelo feedback. Vamos trabalhar para melhorar!'
                      : 'Gostaríamos de saber como foi sua experiencia.'}
                  </p>
                </div>

                {/* Rating */}
                <div className="px-6 py-5">
                  <RatingStars value={rating} onChange={handleRate} />
                </div>

                {/* Google review CTA (only for 3+ stars) */}
                {rating >= 3 && (
                  <div className="px-6 pb-6">
                    <button
                      onClick={handleOpenGoogle}
                      className="w-full h-11 rounded-xl bg-[#D4AF37] text-black text-[12px] font-bold uppercase tracking-wider hover:bg-[#b8962e] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <GoogleIcon className="w-4 h-4" />
                      Avaliar no Google
                      <ExternalLink size={12} />
                    </button>
                    <p className="text-[10px] text-zinc-600 text-center mt-2">
                      Sua avaliacao ajuda outros clientes a nos encontrar
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Thank you state */
              <div className="px-6 py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-7 h-7 text-green-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-bold text-white">Obrigado!</h3>
                <p className="text-[12px] text-zinc-500 mt-1.5">
                  Sua avaliacao faz diferenca para nós.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-5 px-6 py-2.5 bg-white/[0.06] border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReviewRequestModal;
