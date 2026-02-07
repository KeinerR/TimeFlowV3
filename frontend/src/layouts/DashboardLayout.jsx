import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import api from '@/lib/api';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Briefcase,
  Settings,
  Bell,
  LogOut,
  Moon,
  Sun,
  Globe,
  Menu,
  X,
  ChevronLeft,
  Building2,
  Scissors,
  UserCog,
  DollarSign,
  BarChart3,
  Clock
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DashboardLayout = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API}/notifications?unread_only=true`);
      setNotifications(res.data);
      setUnreadCount(res.data.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`);
      setUnreadCount(0);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getNavItems = () => {
    const baseItems = [
      { icon: LayoutDashboard, label: t('nav.dashboard'), path: '' },
    ];

    const roleItems = {
      super_admin: [
        { icon: Building2, label: t('nav.businesses'), path: 'businesses' },
        { icon: Users, label: t('nav.users'), path: 'users' },
        { icon: Calendar, label: t('nav.appointments'), path: 'appointments' },
        { icon: DollarSign, label: t('nav.platform'), path: 'platform-finance' },
        { icon: BarChart3, label: t('nav.reports'), path: 'reports' },
        { icon: Settings, label: t('nav.settings'), path: 'settings' },
      ],
      admin: [
        { icon: Building2, label: t('nav.businesses'), path: 'businesses' },
        { icon: Users, label: t('nav.users'), path: 'users' },
        { icon: Scissors, label: t('nav.services'), path: 'services' },
        { icon: UserCog, label: t('nav.staff'), path: 'staff' },
        { icon: Calendar, label: t('nav.appointments'), path: 'appointments' },
        { icon: Briefcase, label: t('nav.clients'), path: 'clients' },
        { icon: DollarSign, label: t('nav.finance'), path: 'finance' },
        { icon: BarChart3, label: t('nav.reports'), path: 'reports' },
        { icon: Settings, label: t('nav.settings'), path: 'settings' },
      ],
      business: [
        { icon: Scissors, label: t('nav.services'), path: 'services' },
        { icon: UserCog, label: t('nav.staff'), path: 'staff' },
        { icon: Calendar, label: t('nav.appointments'), path: 'appointments' },
        { icon: Briefcase, label: t('nav.clients'), path: 'clients' },
        { icon: DollarSign, label: t('nav.finance'), path: 'finance' },
        { icon: BarChart3, label: t('nav.reports'), path: 'reports' },
        { icon: Settings, label: t('nav.settings'), path: 'settings' },
      ],
      staff: [
        { icon: Calendar, label: t('nav.calendar'), path: 'calendar' },
        { icon: Settings, label: t('nav.settings'), path: 'settings' },
      ],
      client: [
        { icon: Calendar, label: t('nav.appointments'), path: 'appointments' },
        { icon: Settings, label: t('nav.settings'), path: 'settings' },
      ],
    };

    return [...baseItems, ...(roleItems[user?.role] || [])];
  };

  const navItems = getNavItems();
  const basePath = `/${user?.role === 'super_admin' ? 'admin' : user?.role}`;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {sidebarOpen ? (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-bold text-lg">TimeFlow</span>
            </Link>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5 text-white" />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-sidebar-accent transition-colors"
            data-testid="sidebar-toggle"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${!sidebarOpen && 'rotate-180'}`} />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {navItems.map((item) => {
              const fullPath = item.path ? `${basePath}/${item.path}` : basePath;
              const isActive = location.pathname === fullPath || 
                (item.path && location.pathname.startsWith(`${basePath}/${item.path}`));
              
              return (
                <Link
                  key={item.path}
                  to={fullPath}
                  data-testid={`nav-${item.path || 'dashboard'}`}
                  className={`sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-brand text-brand-foreground">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {t(`users.roles.${user?.role}`)}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-lg">TimeFlow</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded hover:bg-sidebar-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {navItems.map((item) => {
              const fullPath = item.path ? `${basePath}/${item.path}` : basePath;
              const isActive = location.pathname === fullPath;
              
              return (
                <Link
                  key={item.path}
                  to={fullPath}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md hover:bg-accent lg:hidden"
            data-testid="mobile-menu-btn"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
              className="p-2 rounded-md hover:bg-accent transition-colors"
              data-testid="lang-toggle"
            >
              <Globe className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-accent transition-colors"
              data-testid="theme-toggle-btn"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-md hover:bg-accent transition-colors relative" data-testid="notifications-btn">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-brand">
                      {unreadCount}
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                  {t('notifications.title')}
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead}>
                      {t('notifications.markAllRead')}
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3">
                      <span className="font-medium">{n.title}</span>
                      <span className="text-sm text-muted-foreground">{n.message}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('notifications.noNotifications')}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors" data-testid="user-menu-btn">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-brand text-brand-foreground text-sm">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`${basePath}/settings`)} data-testid="settings-menu-item">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('common.settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="logout-menu-item">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
