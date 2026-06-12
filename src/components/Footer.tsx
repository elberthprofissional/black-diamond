import React from 'react';
import { Scissors, Phone, MapPin, Globe, Share2, Navigation } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-dark-pure border-t border-white/5 pt-32 pb-16 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gold-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 mb-32">
          
          {/* Brand & Mission */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-3 mb-10 group cursor-pointer">
              <div className="w-10 h-10 bg-gold-600 flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                <Scissors className="text-black w-6 h-6" />
              </div>
              <span className="text-2xl font-serif font-black tracking-widest text-white">BLACK DIAMOND</span>
            </div>
            <p className="text-gray-500 font-light leading-relaxed mb-10 text-lg">
              Elevando o padrão da barbearia clássica. Onde cada corte é um compromisso com a sua melhor versão.
            </p>
            <div className="flex space-x-6">
              {[Globe, Share2, Phone].map((Icon, i) => (
                <a key={i} href="#" className="w-12 h-12 border border-white/10 flex items-center justify-center text-gray-500 hover:border-gold-600 hover:text-gold-600 transition-all duration-500">
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Useful Links */}
          <div>
            <h4 className="text-white font-serif font-bold text-lg tracking-[0.2em] uppercase mb-10">Explorar</h4>
            <ul className="space-y-6 text-gray-500 font-medium text-xs tracking-[0.2em] uppercase">
              {['Início', 'Serviços', 'Sobre', 'Galeria', 'Localização'].map(item => (
                <li key={item}>
                  <a href={`#${item.toLowerCase()}`} className="hover:text-gold-600 transition-colors duration-300 flex items-center group">
                    <span className="w-0 group-hover:w-4 h-[1px] bg-gold-600 mr-0 group-hover:mr-3 transition-all duration-300"></span>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-white font-serif font-bold text-lg tracking-[0.2em] uppercase mb-10">Contato</h4>
            <ul className="space-y-8 text-gray-500 font-light text-lg">
              <li className="flex items-start space-x-4">
                <MapPin className="text-gold-600 w-5 h-5 shrink-0 mt-1" />
                <span>Av. Brasílio da Gama, 139 - Tupi, Belo Horizonte — MG</span>
              </li>
              <li className="flex items-center space-x-4">
                <Phone className="text-gold-600 w-5 h-5 shrink-0" />
                <span>(31) 99955-3580</span>
              </li>
              <li className="flex items-center space-x-4">
                <Navigation className="text-gold-600 w-5 h-5 shrink-0" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-white hover:text-gold-600 cursor-pointer transition-colors">Obter Direções</span>
              </li>
            </ul>
          </div>

          {/* Operating Hours */}
          <div>
            <h4 className="text-white font-serif font-bold text-lg tracking-[0.2em] uppercase mb-10">Horário</h4>
            <ul className="space-y-6 text-gray-500 font-medium text-[10px] tracking-[0.3em] uppercase">
              <li className="flex justify-between border-b border-white/5 pb-4">
                <span>Segunda - Sábado</span>
                <span className="text-white">08:30 - 19:00</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-4 text-gold-600">
                <span>Domingo</span>
                <span className="font-black">Fechado</span>
              </li>
              <li className="pt-4 flex items-center text-red-500 font-black">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                ESTÚDIO FECHADO AGORA
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-gray-600 text-[10px] font-bold tracking-[0.4em] uppercase">
            &copy; {new Date().getFullYear()} BLACK DIAMOND. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center space-x-8 text-[9px] font-black tracking-[0.3em] uppercase text-gray-700">
             <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
             <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
