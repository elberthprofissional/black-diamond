import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import Testimonials from '../components/TestimonialsSlider';
import Gallery from '../components/Gallery';
import Location from '../components/Location';
import Footer from '../components/Footer';

const Home: FC = () => {
  const navigate = useNavigate();

  const handleBooking = () => {
    navigate('/agendar');
  };

  return (
    <>
      <Navbar onBookingClick={handleBooking} />
      <main id="main-content" className="bg-[#0f0f0f]">
        <Hero onBookingClick={handleBooking} />
        <About />
        <Services onBookingClick={handleBooking} />
        <Testimonials />
        <Gallery />
        <Location />
      </main>
      <Footer />
    </>
  );
};

export default Home;
