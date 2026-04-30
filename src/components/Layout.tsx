import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, BarChart3, Settings, LogOut, Shield, Bot, Menu, Users, FileText, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { signOut } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { SearchBar } from '@/components/SearchBar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: 'התנתקת בהצלחה',
      description: 'נתראה בקרוב!',
    });
    navigate('/auth');
  };

  const navItems = [
    { path: '/dashboard', label: 'פגישות', icon: Calendar },
    { path: '/clients', label: 'לקוחות', icon: Users },
    { path: '/invoices', label: 'חשבוניות', icon: FileText },
    { path: '/statistics', label: 'סטטיסטיקות', icon: PieChart },
    { path: '/reports', label: 'דוחות', icon: BarChart3 },
    { path: '/ai-chat', label: 'צ\'אט AI', icon: Bot },
    { path: '/settings', label: 'הגדרות', icon: Settings },
    ...(isAdmin ? [{ path: '/admin', label: 'ניהול משתמשים', icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen relative" dir="rtl">
      {/* Cinematic atmospheric backdrop — fixed across all pages */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background:
            'radial-gradient(1400px 700px at 18% -8%, hsl(13 73% 50% / 0.10) 0%, transparent 60%), radial-gradient(1100px 600px at 95% 110%, hsl(9 60% 36% / 0.14) 0%, transparent 55%)',
        }}
      />
      {/* Top nav — dark glass + coral pulse */}
      <nav className="bg-background/70 backdrop-blur-xl border-b border-foreground/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-10">
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <div className="relative w-9 h-9 bg-primary rounded-sm flex items-center justify-center transition-all group-hover:scale-105">
                  <Calendar className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
                  <div className="absolute inset-0 bg-primary rounded-sm blur-md opacity-50 -z-10 group-hover:opacity-80 transition-opacity" />
                </div>
                <div className="leading-none">
                  <div className="font-serif text-base md:text-lg text-foreground tracking-tight">מערכת ניהול</div>
                  <div className="text-[9px] tracking-[0.3em] uppercase text-primary mt-0.5 hidden md:block font-mono">
                    Business · MMXXVI
                  </div>
                </div>
              </Link>

              {/* Mobile menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <nav className="flex flex-col gap-2 mt-8">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Button
                            variant={isActive ? 'default' : 'ghost'}
                            className="w-full justify-start gap-2"
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </Button>
                        </Link>
                      );
                    })}
                    <div className="border-t pt-4 mt-4">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full justify-start gap-2 text-muted-foreground"
                      >
                        <LogOut className="w-4 h-4" />
                        התנתק
                      </Button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>

              <div className="hidden md:flex items-center gap-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}>
                      <button
                        className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.5 : 2} />
                        {item.label}
                        {isActive && (
                          <>
                            <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary" />
                            <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary blur-sm opacity-70" />
                          </>
                        )}
                      </button>
                    </Link>
                  );
                })}
                <div className="ms-2"><SearchBar /></div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 text-[11px] tracking-[0.2em] uppercase font-mono text-muted-foreground hover:text-primary transition-colors px-2 py-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              התנתק
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 md:py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
