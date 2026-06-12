import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import Gallery from '../components/Gallery';
import Location from '../components/Location';
import Footer from '../components/Footer';
import BookingFlow from '../components/BookingFlow';

const Home: React.FC = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <>
      <Navbar onOpenBooking={() => setIsBookingOpen(true)} />
      <main className="bg-dark-pure">
        <Hero onOpenBooking={() => setIsBookingOpen(true)} />
        <About />
        <Services onOpenBooking={() => setIsBookingOpen(true)} />
        <Gallery />
        <Location />
      </main>
      <Footer />
      <BookingFlow isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </>
  );
};

export default Home;
