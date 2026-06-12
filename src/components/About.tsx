import React from 'react';
import { motion } from 'framer-motion';

const About: React.FC = () => {
  return (
    <section id="sobre" className="py-32 bg-white text-black overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-16">
          {/* Image Column */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2 relative"
          >
            <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden group">
              <img 
                src="https://images.unsplash.com/photo-1599351431247-f10b21ce530d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                alt="O Barbeiro" 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100"
              />
              <div className="absolute inset-0 border-[20px] border-white/10 pointer-events-none" />
            </div>
            {/* Floating Badge */}
            <div className="absolute -bottom-8 -right-8 bg-gold-600 text-black p-8 hidden md:block">
              <span className="text-4xl font-serif font-bold block leading-none">10+</span>
              <span className="text-[10px] uppercase tracking-widest font-bold">Anos de Experiência</span>
            </div>
          </motion.div>

          {/* Text Column */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2"
          >
            <h2 className="text-gold-600 font-sans font-bold text-xs tracking-[0.4em] uppercase mb-4">A Mente por Trás</h2>
            <h3 className="text-4xl md:text-6xl font-serif font-bold text-black mb-8 leading-tight">Legado e <br /> Perfeccionismo.</h3>
            
            <div className="space-y-6 text-gray-600 leading-relaxed font-light text-lg">
              <p>
                Fundada pelo mestre barbeiro da <span className="text-black font-medium">Black Diamond</span>, nossa barbearia nasceu da paixão pela cutelaria clássica e pelo atendimento personalizado. 
              </p>
              <p>
                Acreditamos que cada corte é uma obra de arte única. Nosso compromisso é entregar não apenas um serviço, mas uma experiência de renovação e confiança para o homem que valoriza sua imagem.
              </p>
              <p className="italic font-serif text-black text-xl">
                "Barbearia não é sobre cabelo, é sobre como você se sente ao sair da cadeira."
              </p>
            </div>

            <div className="mt-12 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full border border-gold-600 flex items-center justify-center overflow-hidden">
                 <img src="/assets/logo.png" alt="Assinatura" className="w-8 h-8 object-contain opacity-50" onError={(e) => e.currentTarget.src = "https://www.svgrepo.com/show/513511/scissors.svg"} />
              </div>
              <div>
                <p className="text-black font-bold uppercase tracking-widest text-sm">Equipe Black Diamond</p>
                <p className="text-gray-400 text-xs uppercase tracking-widest">Master Barbers</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
