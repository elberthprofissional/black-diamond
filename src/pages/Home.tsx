import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import Testimonials from '../components/Testimonials';
import Gallery from '../components/Gallery';
import Location from '../components/Location';
import Footer from '../components/Footer';

const Home: React.FC = () => {
  return (
    <>
      <Navbar />
      <main className="bg-[#09090B]">
        <Hero />
        <About />
        <Services />
        <Testimonials />
        <Gallery />
        <Location />
      </main>
      <Footer />
    </>
  );
};

export default Home;
