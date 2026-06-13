import React from 'react';
import { Globe, MessageCircle, MapPin, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-[#0D1117] border-t border-white/5 pt-24 pb-12">
      <div className="container mx-auto px-6">
        {/* PARTE 1: ÁREA DE CONTEÚDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          
          {/* Coluna 1 (Logo e Bio) */}
          <div className="space-y-6">
            <div className="w-16 h-16 flex items-center justify-center">
               <img src="/assets/logo.webp" alt="Black Diamond Logo" className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = "https://www.svgrepo.com/show/513511/scissors.svg"} />
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs font-light">
              A excelência está nos detalhes. Lapidamos sua imagem para refletir sua verdadeira essência.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-zinc-400 hover:border-gold-600 hover:text-gold-600 transition-all duration-300">
                <Globe size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-zinc-400 hover:border-gold-600 hover:text-gold-600 transition-all duration-300">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Coluna 2 (NAVEGAÇÃO) */}
          <div className="space-y-8">
            <h4 className="text-white font-serif font-bold text-lg tracking-[0.2em] uppercase">NAVEGAÇÃO</h4>
            <ul className="flex flex-col space-y-4">
              <li>
                <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-zinc-400 text-xs font-bold tracking-[0.2em] hover:text-white transition-colors uppercase text-left">INÍCIO</button>
              </li>
              <li>
                <a href="#servicos" className="text-zinc-400 text-xs font-bold tracking-[0.2em] hover:text-white transition-colors uppercase">SERVIÇOS</a>
              </li>
              <li>
                <a href="#sobre" className="text-zinc-400 text-xs font-bold tracking-[0.2em] hover:text-white transition-colors uppercase">A HISTÓRIA</a>
              </li>
              <li className="pt-2">
                <button onClick={() => navigate('/agendar')} className="text-gold-600 text-xs font-bold tracking-[0.2em] hover:text-white transition-colors uppercase text-left">AGENDAR HORÁRIO</button>
              </li>
            </ul>
          </div>

          {/* Coluna 3 (CONTATO) */}
          <div className="space-y-8">
            <h4 className="text-white font-serif font-bold text-lg tracking-[0.2em] uppercase">CONTATO</h4>
            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin size={12} className="text-gold-600" />
                  <span className="text-gold-600 text-[10px] font-black tracking-[0.3em] uppercase block">ENDEREÇO</span>
                </div>
                <p className="text-zinc-400 text-sm font-light leading-relaxed">
                  Av. Brasílio da Gama, 139<br />
                  Tupi, Belo Horizonte — MG
                </p>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Phone size={12} className="text-gold-600" />
                  <span className="text-gold-600 text-[10px] font-black tracking-[0.3em] uppercase block">WHATSAPP</span>
                </div>
                <p className="text-zinc-400 text-sm font-light tracking-widest">
                  (31) 99955-3580
                </p>
              </div>
            </div>
          </div>

          {/* Coluna 4 (HORÁRIOS) */}
          <div className="space-y-8">
            <h4 className="text-white font-serif font-bold text-lg tracking-[0.2em] uppercase">HORÁRIOS</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className="text-zinc-400 text-xs font-bold tracking-widest uppercase">SEG — SÁB</span>
                <span className="text-white text-xs font-bold tracking-widest uppercase">08:30 - 19:00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-xs font-bold tracking-widest uppercase">DOMINGO</span>
                <span className="text-zinc-500 text-xs font-light tracking-widest uppercase">Fechado</span>
              </div>
              <div className="pt-4 flex items-center text-red-900/40 font-black text-[9px] tracking-[0.2em] uppercase">
                <div className="w-1 h-1 bg-red-900/40 rounded-full mr-2"></div>
                Estúdio Fechado
              </div>
            </div>
          </div>

        </div>

        {/* PARTE 2: BARRA DE COPYRIGHT */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-600 text-[10px] font-bold tracking-[0.2em] uppercase text-center md:text-left leading-relaxed">
            &copy; 2026 BLACK DIAMOND BARBEARIA. TODOS OS DIREITOS RESERVADOS.
          </p>
          <div className="flex space-x-8 text-zinc-600 text-[10px] font-bold tracking-[0.2em] uppercase">
             <button onClick={() => navigate('/admin/login')} className="hover:text-white transition-colors duration-300">ADMIN</button>
            <a href="#" className="hover:text-white transition-colors duration-300">PRIVACIDADE</a>
            <a href="#" className="hover:text-white transition-colors duration-300">TERMOS</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
