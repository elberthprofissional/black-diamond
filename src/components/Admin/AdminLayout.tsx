import React from 'react';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './Navbar';
import BottomTabs from './BottomTabs';

interface SecondarySidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  wrapperClassName?: string;
  innerClassName?: string;
  mainClassName?: string;
  hideNavbar?: boolean;
  hideBottomTabs?: boolean;
  secondarySidebar?: {
    title: string;
    items: SecondarySidebarItem[];
    activeId: string;
    onSelect: (id: string) => void;
  };
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  wrapperClassName = "min-h-screen bg-[#0A0A0A] text-white font-sans flex selection:bg-[#C5A059]/30",
  innerClassName = "flex-1 lg:ml-[260px] flex flex-col min-h-screen bg-[#0A0A0A] overflow-x-hidden",
  mainClassName = "flex-1 w-full max-w-5xl mx-auto px-5 sm:px-8 lg:px-12 pt-24 lg:pt-12 pb-40",
  hideNavbar = false,
  hideBottomTabs = false,
  secondarySidebar,
}) => {
  return (
    <div className={wrapperClassName}>
      <AdminSidebar />
      <div className={innerClassName}>
        {!hideNavbar && <AdminNavbar />}

        <div className="flex flex-1 min-h-0">
          {/* Secondary Sidebar - Desktop Only */}
          {secondarySidebar && (
            <aside className="hidden lg:flex flex-col w-[240px] border-r border-white/5 bg-[#0A0A0A] sticky top-0 h-screen shrink-0">
              <div className="px-6 h-28 flex items-center">
                <h2 className="text-sm font-black tracking-[0.25em] text-white uppercase">{secondarySidebar.title}</h2>
              </div>
              <div className="px-6">
                <nav className="space-y-1">
                  {secondarySidebar.items.map((item) => {
                    const isActive = secondarySidebar.activeId === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => secondarySidebar.onSelect(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-150 cursor-pointer relative ${
                          isActive
                            ? 'bg-white/5 text-white font-medium'
                            : item.danger
                              ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.06]'
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#C5A059] rounded-r-full" />
                        )}
                        <span className={isActive ? 'text-[#C5A059]' : ''}>{item.icon}</span>
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main id="main-content" className={`flex-1 min-w-0 ${mainClassName}`}>
            {children}
          </main>
        </div>
      </div>
      {!hideBottomTabs && <BottomTabs />}
    </div>
  );
};

export default AdminLayout;
