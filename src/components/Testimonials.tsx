import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

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
    <section id="depoimentos" className="py-40 bg-[#09090B] text-white relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gold-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.5em] uppercase mb-4">Social Proof</h2>
            <h3 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4 tracking-tight uppercase">O QUE NOSSOS CLIENTES DIZEM</h3>
            <div className="h-[1px] w-12 bg-gold-600/30 mx-auto"></div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/[0.02] border border-white/5 p-10 hover:border-gold-600/30 transition-all duration-500 group relative"
            >
              <Quote className="absolute top-8 right-10 text-gold-600/10 w-12 h-12" />
              
              <div className="flex space-x-1 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={12} className="fill-gold-600 text-gold-600" />
                ))}
              </div>

              <p className="text-gray-400 font-light leading-relaxed mb-8 italic">
                "{review.text}"
              </p>

              <div className="flex flex-col border-t border-white/5 pt-6">
                <span className="text-white font-serif font-bold text-sm uppercase tracking-widest">{review.name}</span>
                <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mt-1">{review.date}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <a 
            href="https://www.google.com/maps" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gold-600 transition-colors text-[10px] font-black uppercase tracking-[0.4em] border-b border-gray-800 hover:border-gold-600 pb-2"
          >
            Ver todas as avaliações no Google →
          </a>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
