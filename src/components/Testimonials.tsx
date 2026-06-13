import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Star, User } from 'lucide-react';

const Testimonials: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Configuração do Scroll Progress
  const { scrollXProgress } = useScroll({ container: scrollRef });
  const scaleX = useSpring(scrollXProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Efeito Parallax para o texto de fundo
  const backgroundX = useTransform(scrollXProgress, [0, 1], ["0%", "-20%"]);

  return (
    <section id="depoimentos" className="py-32 md:py-48 bg-[#09090B] text-white relative overflow-hidden select-none">
      
      {/* Texto Parallax Gigante de Fundo */}
      <motion.div 
        style={{ x: backgroundX }}
        className="absolute top-1/2 -translate-y-1/2 left-0 whitespace-nowrap text-[15rem] md:text-[25rem] font-black text-white/[0.02] uppercase pointer-events-none z-0 tracking-tighter"
      >
        EXCELÊNCIA BLACK DIAMOND
      </motion.div>

      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <div className="text-center mb-24 md:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h3 className="text-4xl md:text-7xl font-serif font-bold text-white mb-6 tracking-tight uppercase">
              O QUE DIZEM <br />
              <span className="text-gold-600 italic font-light">SOBRE NÓS.</span>
            </h3>
            <div className="h-[1px] w-24 bg-gold-600/30 mx-auto"></div>
          </motion.div>
        </div>

        {/* Slider com Spotlight Effect */}
        <div 
          ref={scrollRef}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          className="flex overflow-x-auto gap-8 md:gap-12 pb-24 snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="min-w-[85vw] md:min-w-[450px] snap-center bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-10 md:p-12 flex flex-col space-y-8 transition-all duration-700 hover:bg-zinc-900/60 hover:border-gold-600/30 group relative overflow-hidden"
            >
              {/* Efeito Glow Interno no Hover */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-5">
                  <div className="w-14 h-14 rounded-2xl bg-gold-600/10 border border-gold-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <User size={24} className="text-gold-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-lg tracking-tight">{review.name}</span>
                    <span className="text-gold-600/60 text-[10px] uppercase tracking-[0.2em] font-black">Cliente Verificado</span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={14} className="text-[#C5A059] fill-[#C5A059]" />
                  ))}
                </div>
              </div>

              <p className="text-zinc-400 font-sans font-light leading-relaxed text-lg md:text-xl text-left italic relative z-10">
                "{review.text}"
              </p>

              <div className="pt-4 flex items-center justify-between opacity-20 group-hover:opacity-100 transition-opacity duration-700 relative z-10">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] ml-4 text-zinc-500">Black Diamond Studio</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Barra de Progresso Minimalista e Interativa */}
        <div className="max-w-md mx-auto relative h-[2px] bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-gold-600 shadow-[0_0_15px_#C5A059]"
            style={{ scaleX, transformOrigin: "0%" }}
          />
        </div>
        
        <div className="mt-6 text-center">
          <span className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-700 animate-pulse">
            Arraste para explorar
          </span>
        </div>

      </div>
    </section>
  );
};

export default Testimonials;
