import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, BarChart3, Settings, LogOut, Shield, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'התנתקת בהצלחה',
      description: 'נתראה בקרוב!',
    });
    navigate('/auth');
  };

  const navItems = [
    { path: '/dashboard', label: 'פגישות', icon: Calendar },
    { path: '/reports', label: 'דוחות', icon: BarChart3 },
    { path: '/ai-chat', label: 'צ\'אט AI', icon: Bot },
    { path: '/settings', label: 'הגדרות', icon: Settings },
    ...(isAdmin ? [{ path: '/admin', label: 'ניהול משתמשים', icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Top Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">מערכת ניהול</span>
              </Link>

              <div className="hidden md:flex items-center gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}>
                      <Button
                        variant={isActive ? 'default' : 'ghost'}
                        className="gap-2"
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>

            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              התנתק
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
