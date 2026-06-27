import React from 'react';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './Navbar';
import BottomTabs from './BottomTabs';

interface AdminLayoutProps {
  children: React.ReactNode;
  wrapperClassName?: string;
  innerClassName?: string;
  mainClassName?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  wrapperClassName = "min-h-screen bg-[#0A0A0A] text-white font-sans flex selection:bg-[#C5A059]/30",
  innerClassName = "flex-1 lg:ml-[260px] flex flex-col min-h-screen bg-[#0A0A0A] overflow-x-hidden",
  mainClassName = "flex-1 w-full max-w-5xl mx-auto px-5 sm:px-8 lg:px-12 pt-24 lg:pt-12 pb-40"
}) => {
  return (
    <div className={wrapperClassName}>
      <AdminSidebar />
      <div className={innerClassName}>
        <AdminNavbar />
        <main id="main-content" className={mainClassName}>
          {children}
        </main>
      </div>
      <BottomTabs />
    </div>
  );
};

export default AdminLayout;
