import { useRef, useCallback, useState, useEffect, type FC, type MouseEvent } from 'react';
import { User, Star } from 'lucide-react';
import { getActiveTestimonials } from '../lib/api/testimonials';
import { GoogleIcon } from './GoogleReviewBadge';
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
    if (!card) return;
    const { clientWidth } = sliderRef.current;
    const targetLeft = card.offsetLeft + card.clientWidth / 2 - clientWidth / 2;
    sliderRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }, []);

  // Auto-play (uses ref to avoid recreating interval on activeIndex change)
  const activeIndexRef = useRef(activeIndex);
  // Keep ref in sync via useEffect to avoid updating refs during render
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (isHovered || count <= 1) {
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
  }, [isHovered, count, scrollToIndex]);

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
      className="relative py-24 md:py-32 bg-[#0A0A0A] text-white overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-10 md:mb-20">
          <span className="text-[11px] font-sans font-bold uppercase tracking-[0.3em] text-zinc-400 block mb-3">
            DEPOIMENTOS
          </span>
          <h3
            className={`text-3xl sm:text-5xl font-bold uppercase tracking-tight font-sans text-white mb-6 transition-[opacity,transform] duration-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            O QUE DIZEM NOSSOS{' '}
            <span className="font-serif italic font-normal text-zinc-300 lowercase">clientes</span>
          </h3>
          {count > 0 && (
            <div
              className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] transition-[opacity,transform] duration-500 delay-100 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <GoogleIcon className="w-4 h-4" />
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={11} className="fill-[#D4AF37] text-[#D4AF37]" />
                ))}
              </div>
              <div className="w-px h-3 bg-white/10" />
              <span className="text-[11px] text-zinc-400 font-sans whitespace-nowrap">
                Avaliações retiradas do Google
              </span>
            </div>
          )}
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
          className={`flex gap-4 md:gap-6 mb-6 md:mb-8 items-stretch overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 scroll-smooth cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 rounded-lg transition-[opacity,transform] duration-500 delay-75 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {testimonials.map((review, index) => {
            // Anti-burro: fallback seguro pra qualquer campo
            const safeName = review.name || 'Cliente';
            const safeText = review.text || 'Excelente atendimento!'; // Fallback se texto vazio
            const safeRating = Math.min(Math.max(review.rating || 5, 1), 5);
            return (
              <div
                key={review.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Depoimento ${index + 1} de ${count}`}
                className="group relative bg-[#111111] border border-white/[0.04] hover:border-[#D4AF37]/25 p-5 md:p-8 rounded-2xl flex flex-col justify-between gap-4 md:gap-5 h-auto w-[85vw] sm:w-[75vw] md:w-[360px] snap-center shrink-0 transition-[border-color,box-shadow] duration-500 hover:shadow-lg hover:shadow-[#D4AF37]/5"
              >
                {/* Author - top */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-white/[0.06] rounded-full shrink-0 flex items-center justify-center border border-white/[0.08] group-hover:border-white/[0.15] transition-[border-color] duration-500">
                    <User size={15} className="text-zinc-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] md:text-[14px] font-bold text-white tracking-wide">
                      {safeName}
                    </span>
                    {review.publish_time && (
                      <span className="text-[10px] text-zinc-600 font-sans">
                        {new Date(review.publish_time).toLocaleDateString('pt-BR', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating stars */}
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={`transition-[fill,color,filter] duration-300 ${
                        i < safeRating
                          ? 'fill-[#D4AF37] text-[#D4AF37] drop-shadow-[0_0_4px_rgba(212,175,55,0.3)]'
                          : 'text-zinc-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-zinc-300 font-sans font-light text-[14px] md:text-[16px] leading-[1.8] flex-1 relative z-10">
                  {safeText}
                </p>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        {count > 1 && (
          <div
            className={`flex flex-col items-center gap-4 transition-[opacity,transform] duration-500 delay-150 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
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
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-500 cursor-pointer ${
                    activeIndex === index
                      ? 'bg-[#D4AF37] w-8'
                      : 'bg-zinc-700 w-1.5 hover:bg-zinc-500'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
