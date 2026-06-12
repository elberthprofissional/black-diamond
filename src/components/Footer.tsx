import React from 'react';
import { Globe, MessageCircle } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#000000] border-t border-[#333333] pt-24 pb-12">
      <div className="container mx-auto px-6">
        {/* PARTE 1: ÁREA DE CONTEÚDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          
          {/* Coluna 1 (Logo e Bio) */}
          <div className="space-y-6">
            <div className="w-16 h-16 flex items-center justify-center">
               <img src="/assets/logo.webp" alt="Black Diamond Logo" className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = "https://www.svgrepo.com/show/513511/scissors.svg"} />
            </div>
            <p className="text-[#A1A1AA] text-sm leading-relaxed max-w-xs font-light">
              A excelência está nos detalhes. Lapidamos sua imagem para refletir sua verdadeira essência.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full border border-[#333333] flex items-center justify-center text-white hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-300">
                <Globe size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-[#333333] flex items-center justify-center text-white hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-300">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Coluna 2 (NAVEGAÇÃO) */}
          <div className="space-y-8">
            <h4 className="text-white font-serif font-bold text-lg tracking-[0.2em] uppercase">NAVEGAÇÃO</h4>
            <ul className="flex flex-col space-y-4">
              <li>
                <a href="#home" className="text-[#A1A1AA] text-xs font-bold tracking-[0.2em] hover:text-white transition-colors uppercase">INÍCIO</a>
              </li>
              <li>
                <a href="#servicos" className="text-[#A1A1AA] text-xs font-bold tracking-[0.2em] hover:text-white transition-colors uppercase">SERVIÇOS</a>
              </li>
              <li>
                <a href="#sobre" className="text-[#A1A1AA] text-xs font-bold tracking-[0.2em] hover:text-white transition-colors uppercase">A HISTÓRIA</a>
              </li>
              <li className="pt-2">
                <a href="#agendar" className="text-[#D4AF37] text-xs font-bold tracking-[0.2em] hover:text-[#E6C766] transition-colors uppercase">AGENDAR HORÁRIO</a>
              </li>
            </ul>
          </div>

          {/* Coluna 3 (CONTATO) */}
          <div className="space-y-8">
            <h4 className="text-white font-serif font-bold text-lg tracking-[0.2em] uppercase">CONTATO</h4>
            <div className="space-y-6">
              <div>
                <span className="text-[#D4AF37] text-[10px] font-black tracking-[0.3em] uppercase block mb-2">ENDEREÇO</span>
                <p className="text-[#A1A1AA] text-sm font-light leading-relaxed">
                  Av. Brasílio da Gama, 139<br />
                  Tupi, Belo Horizonte — MG
                </p>
              </div>
              <div>
                <span className="text-[#D4AF37] text-[10px] font-black tracking-[0.3em] uppercase block mb-2">WHATSAPP</span>
                <p className="text-[#A1A1AA] text-sm font-light tracking-widest">
                  (31) 99955-3580
                </p>
              </div>
            </div>
          </div>

          {/* Coluna 4 (HORÁRIOS) */}
          <div className="space-y-8">
            <h4 className="text-white font-serif font-bold text-lg tracking-[0.2em] uppercase">HORÁRIOS</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#333333] pb-4">
                <span className="text-[#A1A1AA] text-xs font-bold tracking-widest">SEG — SÁB</span>
                <span className="text-white text-xs font-bold tracking-widest">08:30 - 19:00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA] text-xs font-bold tracking-widest uppercase">DOMINGO</span>
                <span className="text-[#A1A1AA] text-xs font-light tracking-widest uppercase">Fechado</span>
              </div>
            </div>
          </div>

        </div>

        {/* PARTE 2: BARRA DE COPYRIGHT */}
        <div className="pt-12 border-t border-[#333333] flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[#3F3F46] text-[10px] font-bold tracking-[0.2em] uppercase text-center md:text-left leading-relaxed">
            &copy; 2026 BLACK DIAMOND BARBEARIA. TODOS OS DIREITOS RESERVADOS.
          </p>
          <div className="flex space-x-8 text-[#3F3F46] text-[10px] font-bold tracking-[0.2em] uppercase">
            <a href="#" className="hover:text-white transition-colors duration-300">PRIVACIDADE</a>
            <a href="#" className="hover:text-white transition-colors duration-300">TERMOS</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
