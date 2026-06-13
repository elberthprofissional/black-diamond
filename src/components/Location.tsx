import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, Navigation } from 'lucide-react';

const Location: React.FC = () => {
  return (
    <section id="localização" className="py-40 bg-dark-pure relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-stretch gap-16">
          
          {/* Info Column */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full lg:w-5/12 flex flex-col justify-center"
          >
            <h3 className="text-4xl md:text-6xl font-serif font-bold text-white mb-12 leading-tight tracking-tight uppercase">ONDE ESTAMOS <br /><span className="italic font-light">LOCALIZADOS.</span></h3>
            
            <div className="space-y-12">
              <div className="flex items-start space-x-6 group">
                <MapPin className="text-gold-600 w-5 h-5 shrink-0 mt-1" />
                <div>
                  <h4 className="text-gold-600 font-sans font-bold text-[9px] tracking-[0.3em] uppercase mb-3">Endereço</h4>
                  <p className="text-gray-500 font-sans font-light text-lg leading-relaxed">Av. Brasílio da Gama, 139 - Bairro Tupi, <br />Belo Horizonte — MG</p>
                </div>
              </div>

              <div className="flex items-start space-x-6 group">
                <Clock className="text-gold-600 w-5 h-5 shrink-0 mt-1" />
                <div>
                  <h4 className="text-gold-600 font-sans font-bold text-[9px] tracking-[0.3em] uppercase mb-3">Horário</h4>
                  <p className="text-gray-500 font-sans font-light text-lg leading-relaxed">Segunda a Sábado — 08:30 às 19:00</p>
                </div>
              </div>

              <div className="flex items-start space-x-6 group">
                <Phone className="text-gold-600 w-5 h-5 shrink-0 mt-1" />
                <div>
                  <h4 className="text-gold-600 font-sans font-bold text-[9px] tracking-[0.3em] uppercase mb-3">WhatsApp</h4>
                  <p className="text-gray-500 font-sans font-light text-lg leading-relaxed">(31) 99955-3580</p>
                </div>
              </div>
            </div>

            <div className="mt-16">
              <button 
                onClick={() => window.open('https://maps.google.com', '_blank')}
                className="group flex items-center space-x-4 border border-white/10 px-10 py-6 hover:border-gold-600 transition-all duration-700"
              >
                <span className="text-white text-[10px] font-sans font-black uppercase tracking-[0.4em] group-hover:text-gold-600 transition-colors">Abrir no Google Maps</span>
                <Navigation className="w-3 h-3 text-gold-600" />
              </button>
            </div>
          </motion.div>

          {/* Map Column */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-7/12 relative min-h-[500px]"
          >
            <div className="w-full h-full bg-dark-card border border-white/5 relative overflow-hidden shadow-2xl">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3752.9849031916665!2d-43.9202011!3d-19.840591699999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa685e76e58e90f%3A0xf899efab3913f3f7!2sBarbearia%20Black%20Diamond!5e0!3m2!1spt-BR!2sbr!4v1781307318513!5m2!1spt-BR!2sbr" 
                width="100%" 
                height="100%" 
                style={{ border: 0, filter: 'grayscale(1) invert(0.9) contrast(1.2) brightness(0.7)' }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0"
              ></iframe>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Location;
