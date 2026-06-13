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
    },
    {
      name: "Tiago Comam",
      text: "Essa é a melhor barbiaria da região. Tato é bom demais, cara sabe como cuidar de um cabelo.",
      date: "2 meses atrás"
    },
    {
      name: "Alan Nunes",
      text: "Top, super recomendo. Muito obrigado por contar com nossos serviços.",
      date: "2 meses atrás"
    }
  ];

  return (
    <section id="depoimentos" className="py-40 bg-[#09090B] text-white relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.5em] uppercase mb-4">Experiências Reais</h2>
            <h3 className="text-4xl md:text-6xl font-serif font-bold text-white tracking-tight uppercase">O QUE DIZEM <br /> NOSSOS CLIENTES</h3>
          </motion.div>
          
          <div className="hidden md:flex space-x-4 mb-2">
            <div className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center">
              Arraste para o lado <ChevronRight size={14} className="ml-2 animate-bounce-x" />
            </div>
          </div>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="flex overflow-x-auto space-x-6 pb-12 custom-scrollbar snap-x snap-mandatory group">
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="min-w-[300px] md:min-w-[400px] bg-white/[0.02] border border-white/5 p-12 snap-start hover:border-gold-600/30 transition-all duration-700"
            >
              <div className="flex flex-col h-full">
                <div className="mb-8">
                  <h4 className="text-white font-serif font-bold text-lg uppercase tracking-widest mb-2 truncate">
                    {review.name}
                  </h4>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={10} className="fill-gold-600 text-gold-600" />
                    ))}
                  </div>
                </div>

                <p className="text-gray-400 font-light leading-relaxed text-sm md:text-base italic flex-1 mb-10">
                  "{review.text}"
                </p>

                <div className="text-[9px] text-gray-600 uppercase tracking-widest font-black">
                  {review.date}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
