import React from 'react';

const Gallery: React.FC = () => {
  const images = [
    { src: '/assets/gallery/corte-1.webp', alt: 'Corte 1' },
    { src: '/assets/gallery/corte-2.webp', alt: 'Corte 2' },
    { src: '/assets/gallery/corte-3.webp', alt: 'Corte 3' },
    { src: '/assets/gallery/corte-4.webp', alt: 'Corte 4' },
    { src: '/assets/gallery/corte-5.webp', alt: 'Corte 5' },
    { src: '/assets/gallery/corte-6.webp', alt: 'Corte 6' },
    { src: '/assets/gallery/corte-7.webp', alt: 'Corte 7' },
    { src: '/assets/gallery/corte-8.webp', alt: 'Corte 8' },
  ];

  // Double the images for infinite scroll effect
  const displayImages = [...images, ...images];

  return (
    <section id="galeria" className="py-20 md:py-40 bg-[#0A0A0A] overflow-hidden">
      <div className="container mx-auto px-6 mb-10 md:mb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[#D4AF37] font-bebas text-[10px] md:text-xs tracking-[0.6em] uppercase mb-4">Galeria</h2>
          <h3 className="text-4xl sm:text-6xl md:text-8xl font-bebas text-white mb-6 tracking-tight uppercase leading-none">
            MEUS <span className="text-[#D4AF37]">TRABALHOS</span>
          </h3>
          <div className="w-12 h-px bg-[#D4AF37]/30 mx-auto"></div>
        </div>
      </div>

      {/* Infinite Scroll Container */}
      <div className="relative flex overflow-x-hidden" role="region" aria-label="Galeria de trabalhos" aria-roledescription="carrossel">
        <div className="flex animate-marquee whitespace-nowrap gap-4 md:gap-8 px-4" aria-live="off">
          {displayImages.map((img, index) => (
            <div
              key={`${img.alt}-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`Foto ${img.alt}`}
              className="relative w-[280px] md:w-[400px] h-[360px] md:h-[500px] bg-[#1a1a1a] border border-white/[0.03] overflow-hidden flex-shrink-0 group"
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Minimal Frame overlay */}
              <div className="absolute inset-4 border border-white/[0.05] pointer-events-none" />
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 text-center">
        <a
          href="https://www.instagram.com/black.diamond.barbeariaa/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[8px] md:text-[10px] font-medium text-zinc-600 uppercase tracking-[0.4em] hover:text-[#D4AF37] transition-colors duration-300"
        >
          Para mais, siga no Instagram <span className="text-[#D4AF37]">@blackdiamond</span>
        </a>
      </div>
    </section>
  );
};

export default Gallery;
