import { type FC } from 'react';

const Location: FC = () => {
  return (
    <section id="localizacao" className="bg-[#0a0a0a] py-24 md:py-32 relative">
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="mb-10 md:mb-16">
          <span className="text-[11px] font-sans font-bold uppercase tracking-[0.3em] text-zinc-400 block mb-3">
            LOCALIZAÇÃO
          </span>
          <h3 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight font-sans text-white mb-6">
            ONDE ESTAMOS{' '}
            <span className="font-serif italic font-normal text-zinc-300 lowercase">
              localizados
            </span>
          </h3>
        </div>

        {/* Map */}
        <div className="max-w-6xl mx-auto relative">
          <div className="relative w-full h-[300px] md:h-[440px] rounded-sm overflow-hidden border border-white/[0.04] shadow-2xl">
            <iframe
              src="https://www.google.com/maps?q=Av+Brasilio+da+Gama+139+Tupi+Belo+Horizonte+MG&z=16&output=embed"
              style={{
                border: 0,
                width: '100%',
                height: '100%',
              }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização da Black Diamond no Google Maps"
            />
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Location;
