import React from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronRight } from 'lucide-react';

const Testimonials: React.FC = () => {
  const reviews = [
    {
      name: "Eloisa Maria de Morais Ribeiro",
      text: "Barbearia super confortável, ambiente agradável, higiênico profissional super qualificado e atencioso... Parabéns vai explodir",
      date: "2 meses atrás"
    },
    {
      name: "giovanna cardoso",
      text: "Profissional agradável, super atencioso, trabalho impecável e corte perfeito. Super recomendo!!!",
      date: "2 meses atrás"
    },
    {
      name: "Maia Studio",
      text: "Ele foi o único profissional que conseguiu cortar o cabelo do meu filho com paciência, respeito e excelência, ganhando a nossa total confiança.",
      date: "2 meses atrás"
    },
    {
      name: "Fabio Campos",
      text: "Muito satisfeito com o atendimento e o serviço prestado! Super indico! 🫡",
      date: "um mês atrás"
    },
    {
      name: "Renato Dias de Oliveira",
      text: "Profissional !! Talento são pra poucos e esse venezuelano tem bastante.",
      date: "2 meses atrás"
    },
    {
      name: "Anderson Piedrahita",
      text: "Exelente atendimento recomendado. Estaremos aqui sempre para oferecer o melhor.",
      date: "um mês atrás"
    }
  ];

  return (
    <section id="depoimentos" className="py-32 md:py-48 bg-[#09090B] text-white relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 lg:mb-32">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.5em] uppercase mb-6 text-shadow-glow">Social Proof</h2>
            <h3 className="text-5xl md:text-[5rem] font-serif font-bold text-white tracking-tight uppercase leading-none">
              O QUE DIZEM <br /> <span className="italic font-light text-white/90">NOSSOS CLIENTES</span>
            </h3>
          </motion.div>
          
          <div className="hidden md:flex space-x-4 mb-4">
            <div className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.4em] flex items-center">
              Arraste para navegar <ChevronRight size={14} className="ml-3 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Horizontal Scroll Container - Scrollbar Hidden */}
        <div className="flex overflow-x-auto space-x-8 pb-12 scrollbar-hide snap-x snap-mandatory group cursor-grab active:cursor-grabbing">
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="min-w-[320px] md:min-w-[480px] bg-[#121212] border border-zinc-800/40 p-12 md:p-16 snap-start hover:border-gold-600/20 transition-all duration-700 shadow-2xl relative overflow-hidden"
            >
              {/* Subtle background glow for the card */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-600 opacity-[0.02] rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col h-full relative z-10">
                <div className="mb-12">
                  <div className="flex space-x-1.5 mb-6 opacity-80">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={11} className="fill-gold-600 text-gold-600" />
                    ))}
                  </div>
                  <h4 className="text-white font-serif font-bold text-xl uppercase tracking-widest mb-1 truncate">
                    {review.name}
                  </h4>
                  <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.4em]">
                    Verificado via Google
                  </div>
                </div>

                <p className="text-zinc-400 font-light leading-[1.8] text-lg md:text-xl italic flex-1 mb-12">
                  "{review.text}"
                </p>

                <div className="flex items-center justify-between border-t border-white/5 pt-8">
                   <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                     {review.date}
                   </span>
                   <div className="h-px w-12 bg-zinc-800/50" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <button 
            onClick={() => window.open('https://www.google.com/maps', '_blank')}
            className="text-zinc-500 hover:text-gold-600 transition-all duration-500 text-[10px] font-black uppercase tracking-[0.5em] group"
          >
            Ver todas as avaliações no Google 
            <span className="inline-block ml-3 transform group-hover:translate-x-2 transition-transform duration-500">→</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
