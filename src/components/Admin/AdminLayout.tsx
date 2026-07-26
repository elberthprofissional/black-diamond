import { type ReactNode, type FC } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './Navbar';
import BottomTabs from './BottomTabs';
import { BarberProvider } from '../../contexts/BarberContext';
import AuthGuard from './AuthGuard';
import SubscriptionGuard from './shared/SubscriptionGuard';

interface SecondarySidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
}

interface AdminLayoutProps {
  children: ReactNode;
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

const AdminLayout: FC<AdminLayoutProps> = ({
  children,
  wrapperClassName = 'min-h-screen bg-[#0A0A0A] text-white font-sans flex selection:bg-[#D4AF37]/30',
  innerClassName = 'flex-1 lg:ml-[260px] flex flex-col min-h-screen bg-[#0A0A0A] overflow-x-hidden',
  // Default padding/max-width consistent across all admin pages.
  // Pages can override via mainClassName prop when they need special treatment.
  mainClassName = 'w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-20 lg:pt-8 pb-40 max-w-[1440px]',
  hideNavbar = false,
  hideBottomTabs = false,
  secondarySidebar,
}) => {
  return (
    <BarberProvider>
      <AuthGuard>
        <div className={wrapperClassName}>
          <AdminSidebar />
          <div className={innerClassName}>
            {!hideNavbar && <AdminNavbar />}

            <div className="flex flex-1 min-h-0">
              {/* Secondary Sidebar - Desktop Only */}
              {secondarySidebar && (
                <aside className="hidden lg:flex flex-col w-[240px] border-r border-white/5 bg-[#0A0A0A] sticky top-0 h-screen shrink-0">
                  <div className="px-6 h-28 flex items-center">
                    <h2 className="text-sm font-black tracking-[0.25em] text-white uppercase">
                      {secondarySidebar.title}
                    </h2>
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
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#D4AF37] rounded-r-full" />
                            )}
                            <span className={isActive ? 'text-[#D4AF37]' : ''}>{item.icon}</span>
                            {item.label}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </aside>
              )}

              {/* Main Content — flex-1 wrapper centers the child via mx-auto on block */}
              <div className="flex-1 min-w-0 overflow-y-auto">
                <main id="main-content" className={mainClassName}>
                  <SubscriptionGuard>
                    {children}
                  </SubscriptionGuard>
                </main>
              </div>
            </div>
          </div>
          {!hideBottomTabs && <BottomTabs />}
        </div>
      </AuthGuard>
    </BarberProvider>
  );
};

export default AdminLayout;
