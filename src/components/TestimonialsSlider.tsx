import { useRef, useCallback, useState, useEffect, useMemo, type FC, type MouseEvent } from 'react';
import { User, Star, Quote, Pause, Play } from 'lucide-react';
import { getActiveTestimonials } from '../lib/api/testimonials';
import { calculateAverageRating } from '../lib/google-reviews';
import type { Testimonial } from '../types';

const Testimonials: FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    let cancelled = false;
    getActiveTestimonials()
      .then((data) => {
        if (cancelled) return;
        setTestimonials(data);
      })
      .catch(() => {
        // Se erro de rede/bd, mantém vazio
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
  const avgRating = useMemo(() => calculateAverageRating(testimonials), [testimonials]);

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

  // Auto-play (uses ref to avoid recreating interval on activeIndex change)
  const activeIndexRef = useRef(activeIndex);
  // Keep ref in sync via useEffect to avoid updating refs during render
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!isAutoPlaying || isHovered || count <= 1) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }
    autoPlayRef.current = setInterval(() => {
      const next = (activeIndexRef.current + 1) % count;
      scrollToIndex(next);
    }, 4000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, isHovered, count, scrollToIndex]);

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
            {avgRating > 0 && (
              <>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="fill-[#D4AF37] text-[#D4AF37]" />
                  ))}
                </div>
                <span className="text-[12px] text-[#D4AF37] font-bold font-roboto ml-1">
                  {avgRating.toFixed(1)}
                </span>
              </>
            )}
            <span className="text-[12px] text-zinc-500 font-roboto ml-1">
              {count > 0
                ? `de ${count} depoimento${count !== 1 ? 's' : ''}`
                : 'Depoimentos dos nossos clientes'}
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
          {testimonials.map((review, index) => {
          // Anti-burro: fallback seguro pra qualquer campo
          const safeName = review.name || 'Cliente';
          const safeText = review.text || 'Excelente atendimento!';  // Fallback se texto vazio
          const safeRating = Math.min(Math.max(review.rating || 5, 1), 5);
          return (
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
                      i < safeRating
                        ? 'fill-[#D4AF37] text-[#D4AF37] drop-shadow-[0_0_4px_rgba(212,175,55,0.3)]'
                        : 'text-zinc-700'
                    }`}
                  />
                ))}
              </div>

              {/* Testimonial text */}
              <p className="text-zinc-300 font-roboto font-light text-[14px] md:text-[16px] leading-[1.8] flex-1 relative z-10">
                <span className="text-[#D4AF37]/40 text-xl font-serif mr-1">&ldquo;</span>
                {safeText}
                <span className="text-[#D4AF37]/40 text-xl font-serif ml-1">&rdquo;</span>
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.03]">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 rounded-full shrink-0 flex items-center justify-center border border-[#D4AF37]/10 group-hover:border-[#D4AF37]/30 transition-all duration-500">
                  <User size={15} className="text-[#D4AF37]/70" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] md:text-[14px] font-bold text-white tracking-wide">
                    {safeName}
                  </span>
                  {review.publish_time && (
                    <span className="text-[10px] text-zinc-600 font-roboto">
                      {new Date(review.publish_time).toLocaleDateString('pt-BR', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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

            {/* Auto-play toggle */}
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
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
