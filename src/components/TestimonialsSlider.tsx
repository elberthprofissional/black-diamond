import { useRef, useCallback, useState, useEffect, type FC, type MouseEvent } from 'react';
import { User, Star, Quote, Pause, Play } from 'lucide-react';
import { getActiveTestimonials } from '../lib/api/testimonials';
import type { Testimonial } from '../types';

const hardcodedTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'YP TATTOO',
    rating: 5,
    text: 'Barbearia super confortável, ambiente agradável, profissional qualificado e atencioso.',
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'HELBERT HENRIQUE',
    rating: 5,
    text: 'Venezuelano mais fera de BH!! Tem o macete.',
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'MAIA STUDIO',
    rating: 5,
    text: 'Único profissional que conseguiu cortar o cabelo do meu filho com paciência e excelência.',
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'GIOVANNA CARDOSO',
    rating: 5,
    text: 'Profissional agradável, super atencioso, trabalho impecável e corte perfeito. Super recomendo!',
    is_active: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'GUILHERME HENRIQUE',
    rating: 5,
    text: 'Ótimo profissional, lugar aconchegante e trabalho impecável!',
    is_active: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'MATHEUS',
    rating: 5,
    text: 'Tato é bom demais, cara sabe como cuidar de um cabelo.',
    is_active: true,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
];

const GoogleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
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
);

const Testimonials: FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(hardcodedTestimonials);

  // Tenta carregar do Supabase; se falhar, mantém hardcoded
  useEffect(() => {
    let cancelled = false;
    getActiveTestimonials()
      .then((data) => {
        if (cancelled) return;
        if (data.length > 0) {
          setTestimonials(data);
        }
      })
      .catch(() => {
        // Se erro de rede/bd, mantém hardcoded
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftVal = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);

  const count = testimonials.length;

  // Intersection Observer para animação de entrada
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (!sliderRef.current || count === 0) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    const cardWidth = (scrollWidth - clientWidth) / Math.max(count - 1, 1);
    setActiveIndex(Math.min(Math.round(scrollLeft / cardWidth), count - 1));
  }, [count]);

  const scrollToIndex = useCallback((index: number) => {
    if (!sliderRef.current) return;
    const card = sliderRef.current.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying || isHovered || count <= 1) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }
    autoPlayRef.current = setInterval(() => {
      const next = (activeIndex + 1) % count;
      scrollToIndex(next);
    }, 4000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, isHovered, activeIndex, count, scrollToIndex]);

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

  return (
    <section
      id="depoimentos"
      ref={sectionRef}
      className="relative py-20 md:py-40 bg-[#0A0A0A] text-white overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#D4AF37]/[0.02] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#D4AF37]/[0.01] rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-12 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full mb-6">
            <GoogleIcon className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-[0.2em]">
              Google
            </span>
          </div>
          <h3
            className={`text-3xl sm:text-4xl md:text-6xl font-bebas text-white mb-4 uppercase tracking-[0.05em] transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            O QUE DIZEM NOSSOS <span className="text-[#D4AF37]">CLIENTES</span>
          </h3>
          <div
            className={`flex items-center justify-center gap-2 transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-[#D4AF37] text-[#D4AF37]" />
              ))}
            </div>
            <span className="text-[12px] text-zinc-500 font-roboto ml-1">
              Avaliações reais dos nossos clientes
            </span>
          </div>
        </div>

        {/* Slider */}
        <div
          ref={sliderRef}
          role="region"
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label="Depoimentos de clientes"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            handleMouseUp();
          }}
          className={`flex gap-5 md:gap-6 mb-8 items-stretch overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 scroll-smooth cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 rounded-lg transition-all duration-700 delay-150 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {testimonials.map((review, index) => (
            <div
              key={review.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`Depoimento ${index + 1} de ${count}`}
              className="group relative bg-[#111111] border border-white/[0.04] hover:border-[#D4AF37]/25 p-6 md:p-8 rounded-2xl flex flex-col justify-between gap-5 h-auto w-[80vw] sm:w-[75vw] md:w-[360px] snap-center shrink-0 transition-all duration-500 hover:shadow-lg hover:shadow-[#D4AF37]/5"
            >
              {/* Quote decoration */}
              <div className="absolute top-4 right-4 md:top-6 md:right-6 text-[#D4AF37]/10">
                <Quote size={40} className="md:w-12 md:h-12" />
              </div>

              {/* Rating stars */}
              <div className="flex gap-0.5 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={`transition-all duration-300 ${
                      i < review.rating
                        ? 'fill-[#D4AF37] text-[#D4AF37] drop-shadow-[0_0_4px_rgba(212,175,55,0.3)]'
                        : 'text-zinc-700'
                    }`}
                  />
                ))}
              </div>

              {/* Testimonial text */}
              <p className="text-zinc-300 font-roboto font-light text-[14px] md:text-[15px] leading-[1.8] flex-1 relative z-10">
                <span className="text-[#D4AF37]/40 text-xl font-serif mr-1">&ldquo;</span>
                {review.text}
                <span className="text-[#D4AF37]/40 text-xl font-serif ml-1">&rdquo;</span>
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.03]">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 rounded-full shrink-0 flex items-center justify-center border border-[#D4AF37]/10 group-hover:border-[#D4AF37]/30 transition-all duration-500">
                  <User size={15} className="text-[#D4AF37]/70" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] md:text-[13px] font-bold text-white tracking-wide">
                    {review.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        {count > 1 && (
          <div
            className={`flex flex-col items-center gap-4 transition-all duration-700 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Dots */}
            <div
              className="flex items-center gap-2"
              role="tablist"
              aria-label="Navegação dos depoimentos"
            >
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  role="tab"
                  aria-selected={activeIndex === index}
                  aria-label={`Ir para depoimento ${index + 1}`}
                  onClick={() => scrollToIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                    activeIndex === index
                      ? 'bg-[#D4AF37] w-8'
                      : 'bg-zinc-700 w-1.5 hover:bg-zinc-500'
                  }`}
                />
              ))}
            </div>

            {/* Auto-play toggle + Google link */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                aria-label={
                  isAutoPlaying ? 'Pausar rolagem automática' : 'Iniciar rolagem automática'
                }
                className="flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
              >
                {isAutoPlaying ? <Pause size={10} /> : <Play size={10} />}
                <span className="font-roboto uppercase tracking-[0.15em]">
                  {isAutoPlaying ? 'Auto' : 'Parado'}
                </span>
              </button>

              <span className="text-zinc-700 text-[8px]">|</span>

              <span className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-roboto uppercase tracking-[0.15em]">
                <GoogleIcon className="w-3 h-3" />
                Avaliações verificadas
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
