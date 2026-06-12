import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Footer from '../components/Footer';
import BookingFlow from '../components/BookingFlow';

const Home: React.FC = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <>
      <Navbar onOpenBooking={() => setIsBookingOpen(true)} />
      <main>
        <Hero onOpenBooking={() => setIsBookingOpen(true)} />
        <Services onOpenBooking={() => setIsBookingOpen(true)} />
      </main>
      <Footer />
      <BookingFlow isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </>
  );
};

export default Home;
