import React from 'react';
import { Scissors, Phone, MapPin, Globe, Share2 } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-dark-card border-t border-dark-border pt-20 pb-10">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2 mb-6">
              <Scissors className="text-gold-600 w-8 h-8" />
              <span className="text-2xl font-serif font-bold tracking-widest text-white">BLACK DIAMOND</span>
            </div>
            <p className="text-gray-400 font-light mb-8 max-w-sm">
              Sua barbearia de luxo preferida. Oferecemos serviços de alta qualidade com os melhores profissionais da região.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-full border border-dark-border flex items-center justify-center text-gray-400 hover:border-gold-600 hover:text-gold-600 transition-all">
                <Globe size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-dark-border flex items-center justify-center text-gray-400 hover:border-gold-600 hover:text-gold-600 transition-all">
                <Share2 size={20} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-serif font-bold text-xl mb-6">Links Rápidos</h4>
            <ul className="space-y-4 text-gray-400 font-light">
              <li><a href="#home" className="hover:text-gold-600 transition-colors">Início</a></li>
              <li><a href="#servicos" className="hover:text-gold-600 transition-colors">Serviços</a></li>
              <li><a href="#sobre" className="hover:text-gold-600 transition-colors">Sobre Nós</a></li>
              <li><a href="#contato" className="hover:text-gold-600 transition-colors">Contato</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-serif font-bold text-xl mb-6">Contato</h4>
            <ul className="space-y-4 text-gray-400 font-light">
              <li className="flex items-start">
                <MapPin className="text-gold-600 w-5 h-5 mr-3 mt-1 shrink-0" />
                <span>Rua das Barbearias, 123 - Centro, Sua Cidade - SC</span>
              </li>
              <li className="flex items-center">
                <Phone className="text-gold-600 w-5 h-5 mr-3 shrink-0" />
                <span>(48) 99999-9999</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-white font-serif font-bold text-xl mb-6">Horário</h4>
            <ul className="space-y-4 text-gray-400 font-light">
              <li className="flex justify-between">
                <span>Segunda - Sexta</span>
                <span className="text-white">09:00 - 20:00</span>
              </li>
              <li className="flex justify-between">
                <span>Sábado</span>
                <span className="text-white">09:00 - 18:00</span>
              </li>
              <li className="flex justify-between text-gold-600">
                <span>Domingo</span>
                <span>Fechado</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-dark-border pt-10 text-center">
          <p className="text-gray-500 text-sm font-light">
            &copy; {new Date().getFullYear()} BLACK DIAMOND Barbearia. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
