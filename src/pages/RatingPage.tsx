import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

const RatingPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Selecione uma nota');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select('client_id')
        .eq('id', bookingId)
        .single();

      if (!booking) {
        setError('Agendamento não encontrado');
        setLoading(false);
        return;
      }

      // Check for existing review
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', bookingId)
        .limit(1)
        .maybeSingle();

      if (existingReview) {
        setError('Você já avaliou este atendimento.');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        client_id: booking.client_id,
        rating,
        comment: comment || null,
      });

      if (insertError) throw insertError;

      setSubmitted(true);
    } catch {
      setError('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="w-20 h-20 rounded-full bg-[#C5A059]/10 flex items-center justify-center mx-auto">
            <Check size={36} className="text-[#C5A059]" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-white">Obrigado!</h1>
            <p className="text-zinc-500">Sua avaliação foi registrada com sucesso.</p>
          </div>

          <p className="text-xs text-zinc-600">Black Diamond</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-black tracking-[0.4em] text-[#C5A059] uppercase">
            Black Diamond
          </span>
          <h1 className="text-2xl font-bold text-white">Como foi seu atendimento?</h1>
          <p className="text-sm text-zinc-500">Sua opinião nos ajuda a melhorar cada dia.</p>
        </div>

        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8 space-y-8">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => {
                  setRating(star);
                  setError('');
                }}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
                className="transition-transform hover:scale-110 cursor-pointer"
              >
                <Star
                  size={40}
                  className={`transition-colors ${
                    star <= (hoveredStar || rating)
                      ? 'text-[#C5A059] fill-[#C5A059]'
                      : 'text-zinc-700'
                  }`}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-sm text-zinc-400"
            >
              {rating === 1 && 'Não gostei 😕'}
              {rating === 2 && 'Poderia ser melhor 🤔'}
              {rating === 3 && 'Foi bom 🙂'}
              {rating === 4 && 'Muito bom! 😊'}
              {rating === 5 && 'Excelente! 🔥'}
            </motion.p>
          )}

          <div>
            <label
              htmlFor="review-comment"
              className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2"
            >
              Comentário <span className="text-zinc-600 font-normal">(opcional)</span>
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte como foi sua experiência..."
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#C5A059]/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-zinc-700 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="w-full h-12 bg-[#C5A059] hover:bg-[#A68233] text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              'Enviar Avaliação'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingPage;
