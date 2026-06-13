import React from 'react';
import { Instagram } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black py-12 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 border-b border-white/5 pb-12">
          <div className="flex flex-col items-center md:items-start space-y-4">
            <div className="flex items-center space-x-3">
              <img src="/assets/logo.webp" alt="Black Diamond" className="w-10 h-10 object-contain" />
              <span className="text-xl font-serif font-bold tracking-[0.2em] text-white uppercase">BLACK DIAMOND</span>
            </div>
            <p className="text-zinc-500 text-[10px] tracking-[0.3em] uppercase font-medium">Excelência em cada detalhe</p>
            
            <a 
              href="https://www.instagram.com/black.diamond.barbeariaa/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-zinc-400 hover:text-[#C5A059] transition-colors group pt-2"
            >
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#C5A059]/50 transition-all">
                <Instagram size={14} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Instagram</span>
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-12 md:gap-20">
            <div className="space-y-4">
              <h4 className="text-gold-600 font-sans font-bold text-[9px] tracking-[0.3em] uppercase">Horário</h4>
              <ul className="space-y-2 text-zinc-400 text-xs">
                <li>Seg — Sex: 08:30 às 19:00</li>
                <li>Sábado: 08:30 às 19:00</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-gold-600 font-sans font-bold text-[9px] tracking-[0.3em] uppercase">Contato</h4>
              <ul className="space-y-2 text-zinc-400 text-xs">
                <li>(31) 99955-3580</li>
                <li>@blackdiamond.bhe</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em]">
          <p>© 2026 Black Diamond. Todos os direitos reservados.</p>
          <p className="flex items-center gap-2">Desenvolvido por <span className="text-white tracking-widest">Elberth Mayan</span></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
