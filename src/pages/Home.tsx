import { type FC } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import Testimonials from '../components/TestimonialsSlider';
import Gallery from '../components/Gallery';
import Location from '../components/Location';
import Footer from '../components/Footer';
import BackToTop from '../components/BackToTop';

const Home: FC = () => {
  return (
    <>
      <Navbar />
      <BackToTop />
      <main id="main-content" className="bg-[#121212]">
        <Hero />
        <About />
        <Services />
        <Gallery />
        <Testimonials />
        <Location />
      </main>
      <Footer />
    </>
  );
};

export default Home;
