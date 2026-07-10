import { useRef, useCallback, useState, type FC, type MouseEvent } from 'react';
import { User, Star } from 'lucide-react';

interface Review {
  name: string;
  rating: number;
  text: string;
}

const REVIEWS: Review[] = [
  {
    name: 'YP TATTOO',
    rating: 5,
    text: 'Barbearia super confortável, ambiente agradável, profissional qualificado e atencioso.',
  },
  { name: 'HELBERT HENRIQUE', rating: 5, text: 'Venezuelano mais fera de BH!! Tem o macete.' },
  {
    name: 'MAIA STUDIO',
    rating: 5,
    text: 'Único profissional que conseguiu cortar o cabelo do meu filho com paciência e excelência.',
  },
  {
    name: 'GIOVANNA CARDOSO',
    rating: 5,
    text: 'Profissional agradável, super atencioso, trabalho impecável e corte perfeito. Super recomendo!',
  },
  {
    name: 'GUILHERME HENRIQUE',
    rating: 5,
    text: 'Ótimo profissional, lugar aconchegante e trabalho impecável!',
  },
  { name: 'MATHEUS', rating: 5, text: 'Tato é bom demais, cara sabe como cuidar de um cabelo.' },
];

const Testimonials: FC = () => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftVal = useRef(0);

  const handleScroll = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    const cardWidth = (scrollWidth - clientWidth) / Math.max(REVIEWS.length - 1, 1);
    setActiveIndex(Math.min(Math.round(scrollLeft / cardWidth), REVIEWS.length - 1));
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!sliderRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - sliderRef.current.offsetLeft;
    scrollLeftVal.current = sliderRef.current.scrollLeft;
    sliderRef.current.style.cursor = 'grabbing';
    sliderRef.current.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    sliderRef.current.scrollLeft = scrollLeftVal.current - (x - startX.current);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (sliderRef.current) {
      sliderRef.current.style.cursor = 'grab';
      sliderRef.current.style.userSelect = '';
    }
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (!sliderRef.current) return;
    const card = sliderRef.current.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  return (
    <section id="depoimentos" className="py-20 md:py-40 bg-[#141414] text-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 md:mb-20">
          <h3 className="text-2xl sm:text-3xl md:text-5xl font-serif text-white mb-6 uppercase tracking-tight">
            O QUE DIZEM NOSSOS <span className="text-[#D4AF37] italic font-light">CLIENTES.</span>
          </h3>
          <div className="flex items-center justify-center gap-3">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <p className="text-[9px] md:text-[10px] font-roboto font-normal text-[#D4AF37] uppercase tracking-[0.4em]">
              AVALIAÇÕES REAIS DOS NOSSOS CLIENTES
            </p>
          </div>
        </div>

        <div
          ref={sliderRef}
          role="region"
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label="Depoimentos de clientes"
          className="flex gap-5 mb-8 items-stretch overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 scroll-smooth cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 rounded-lg"
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {REVIEWS.map((review, index) => (
            <div
              key={index}
              role="group"
              aria-roledescription="slide"
              aria-label={`Depoimento ${index + 1} de ${REVIEWS.length}`}
              className="bg-[#1a1a1a] border border-white/[0.02] p-7 md:p-10 rounded-2xl flex flex-col gap-6 h-auto hover:border-[#D4AF37]/20 transition-all duration-500 w-[80vw] sm:w-[75vw] md:w-[340px] snap-center shrink-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 md:w-12 md:h-12 bg-[#222222] rounded-full shrink-0 flex items-center justify-center border border-white/5">
                  <User size={18} className="text-zinc-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] md:text-sm font-roboto font-bold text-white tracking-wide">
                    {review.name}
                  </span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        className={`text-[#D4AF37] ${i < review.rating ? 'fill-[#D4AF37]' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-zinc-400 font-roboto font-light text-[15px] md:text-base leading-relaxed">
                &ldquo;{review.text}&rdquo;
              </p>
            </div>
          ))}
        </div>

        <div
          className="flex justify-center gap-2 mb-6"
          role="tablist"
          aria-label="Navegação dos depoimentos"
        >
          {REVIEWS.map((_, index) => (
            <button
              key={index}
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={`Ir para depoimento ${index + 1}`}
              onClick={() => scrollToIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                activeIndex === index ? 'bg-[#D4AF37] w-6' : 'bg-zinc-700 hover:bg-zinc-500'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
