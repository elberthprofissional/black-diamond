import { type FC } from 'react';

const Location: FC = () => {
  return (
    <section id="localizacao" className="bg-[#0A0A0A]">
      <div className="w-full h-[300px] md:h-[400px] relative">
        <iframe
          src="https://www.google.com/maps?q=Av+Brasilio+da+Gama+139+Tupi+Belo+Horizonte+MG&z=16&output=embed"
          style={{ border: 0, width: '100%', height: '100%' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Localização da Black Diamond no Google Maps"
        />
      </div>
    </section>
  );
};

export default Location;
