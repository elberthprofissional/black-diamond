import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Star, User, ChevronLeft, ChevronRight } from 'lucide-react';

const Testimonials: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const reviews = [
    {
      name: "YP TATTOO",
      text: "Barbearia super confortável, ambiente agradável, higiênico profissional super qualificado e atencioso... Parabéns vai explodir",
      rating: 5
    },
    {
      name: "Helbert Henrique",
      text: "Venezuelano mais fera de BH!! Tem o macete",
      rating: 5
    },
    {
      name: "Maia Studio",
      text: "Ele foi o único profissional que conseguiu cortar o cabelo do meu filho com paciência, respeito e excelência, ganhando a nossa total confiança.",
      rating: 5
    },
    {
      name: "Renato Dias",
      text: "Profissional !! Talento são pra poucos e esse venezuelano tem bastante",
      rating: 5
    },
    {
      name: "Lucas Campos",
      text: "Muito satisfeito com o corte, atendimento de qualidade 👏🏽👏🏽",
      rating: 5
    },
    {
      name: "GabrielLuiz",
      text: "Otimo atendimento, lugar top Experiente incrível, super recomendo !",
      rating: 5
    },
    {
      name: "Marcos Crisley",
      text: "Top trabalhado excelente bom papo e um ótimo atendimento",
      rating: 5
    },
    {
      name: "Matheus",
      text: "Tato é bom demais, cara sabe como cuidar de um cabelo",
      rating: 5
    },
    {
      name: "Guilherme Henrique",
      text: "Ótimo profissional, lugar aconchegante e trabalho impecável!",
      rating: 5
    },
    {
      name: "Fabio Campos",
      text: "Muito satisfeito com o atendimento e o serviço prestado! Super indico! 🫡",
      rating: 5
    }
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth 
        : scrollLeft + clientWidth;
      
      scrollRef.current.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section id="depoimentos" className="py-32 md:py-48 bg-[#09090B] text-white relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10 max-w-6xl">
        <div className="flex justify-between items-end mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 tracking-tight uppercase">O QUE NOSSOS CLIENTES DIZEM</h3>
            <div className="h-[1px] w-12 bg-gold-600/30"></div>
          </motion.div>

          {/* Botões de Navegação Desktop */}
          <div className="hidden md:flex gap-4">
            <button 
              onClick={() => scroll('left')}
              className="p-4 border border-white/10 rounded-full hover:bg-white/5 hover:border-gold-600/50 transition-all duration-300 group"
            >
              <ChevronLeft size={20} className="text-zinc-500 group-hover:text-gold-600" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="p-4 border border-white/10 rounded-full hover:bg-white/5 hover:border-gold-600/50 transition-all duration-300 group"
            >
              <ChevronRight size={20} className="text-zinc-500 group-hover:text-gold-600" />
            </button>
          </div>
        </div>

        {/* Slider Unificado */}
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-6 md:gap-8 pb-12 snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="min-w-[85vw] md:min-w-[calc(33.333%-1.5rem)] snap-center md:snap-start bg-[#1A1A1A] border border-zinc-800 rounded-lg p-8 flex flex-col space-y-6 transition-all duration-500 hover:border-zinc-700 shadow-sm"
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
              <p className="text-zinc-400 font-sans font-light leading-relaxed text-sm text-left italic flex-1">
                "{review.text}"
              </p>
            </motion.div>
          ))}
        </div>

        {/* Pontinhos de Paginação (Visíveis em todos, mas úteis no Mobile) */}
        <div className="flex justify-center items-center space-x-3 mt-8">
          <div className="w-2 h-2 rounded-full bg-[#C5A059] shadow-[0_0_10px_rgba(197,160,89,0.5)]"></div>
          <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
          <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
        </div>

      </div>
    </section>
  );
};

export default Testimonials;
