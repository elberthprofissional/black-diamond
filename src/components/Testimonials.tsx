import React from 'react';
import { motion } from 'framer-motion';
import { Star, User } from 'lucide-react';

const Testimonials: React.FC = () => {
  const reviews = [
    {
      name: "Eloisa Maria",
      text: "Barbearia super confortável, ambiente agradável, higiênico profissional super qualificado e atencioso... Parabéns vai explodir",
      rating: 5
    },
    {
      name: "Giovanna Cardoso",
      text: "Profissional agradável, super atencioso, trabalho impecável e corte perfeito. Super recomendo!!!",
      rating: 5
    },
    {
      name: "Maia Studio",
      text: "Ele foi o único profissional que conseguiu cortar o cabelo do meu filho com paciência, respeito e excelência, ganhando a nossa total confiança.",
      rating: 5
    }
  ];

  return (
    <section id="depoimentos" className="py-32 md:py-48 bg-[#09090B] text-white relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10 max-w-6xl">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 tracking-tight uppercase">O QUE NOSSOS CLIENTES DIZEM</h3>
            <div className="h-[1px] w-12 bg-gold-600/30 mx-auto"></div>
          </motion.div>
        </div>

        {/* Grid de 3 colunas no Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-8 flex flex-col space-y-6 transition-all duration-500 hover:border-zinc-700 shadow-sm"
            >
              {/* Cabeçalho do Card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-600 flex items-center justify-center overflow-hidden">
                    <User size={20} className="text-zinc-300" />
                  </div>
                  <span className="text-zinc-100 font-medium text-sm tracking-wide">{review.name}</span>
                </div>
                <div className="flex space-x-1">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={14} className="text-[#C5A059] fill-[#C5A059]" />
                  ))}
                </div>
              </div>

              {/* Texto do Depoimento */}
              <p className="text-zinc-400 font-sans font-light leading-relaxed text-sm text-left">
                "{review.text}"
              </p>
            </motion.div>
          ))}
        </div>

        {/* Pontinhos de Paginação */}
        <div className="flex justify-center items-center space-x-3 mt-16">
          <div className="w-2 h-2 rounded-full bg-[#C5A059] shadow-[0_0_10px_rgba(197,160,89,0.5)]"></div>
          <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
          <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
        </div>

      </div>
    </section>
  );
};

export default Testimonials;
