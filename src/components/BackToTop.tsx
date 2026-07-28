import { useState, useEffect, type FC } from 'react';
import { ChevronUp } from 'lucide-react';

const BackToTop: FC = () => {
  const [visible, setVisible] = useState(() => window.scrollY > 500);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setVisible(window.scrollY > 500);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Voltar ao topo"
      className={`fixed bottom-24 right-5 z-[150] w-11 h-11 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 transition-all duration-300 hover:bg-[#b8962e] hover:scale-110 active:scale-95 ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <ChevronUp size={20} />
    </button>
  );
};

export default BackToTop;
