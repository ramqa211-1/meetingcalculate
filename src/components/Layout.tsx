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
    <div className="min-h-screen" dir="rtl">
      {/* Editorial masthead nav */}
      <nav className="bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-10">
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-foreground rounded-sm flex items-center justify-center transition-transform group-hover:rotate-3">
                  <Calendar className="w-4 h-4 text-background" strokeWidth={2.5} />
                </div>
                <div className="leading-none">
                  <div className="font-serif text-base md:text-lg text-foreground tracking-tight">מערכת ניהול</div>
                  <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mt-0.5 hidden md:block">
                    Business Quarterly
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

              <div className="hidden md:flex items-center gap-1">
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
                          <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-foreground" />
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
              className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
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
