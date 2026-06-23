import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, User, ListTodo, Users, Briefcase, Bell, LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { ComponentType, ReactElement } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import defaultAvatar from "@/assets/defult.jpg";
import { Button } from "@/components/ui/button";

type NavItem = {
  path: string;
  icon: ComponentType<{ className?: string }> | (() => ReactElement);
  label?: string;
};

export default function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, token } = useAuth(); // Added token
  const mobileContainerRef = useRef<HTMLDivElement | null>(null);
  const desktopContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileItemRefs = useRef<(HTMLElement | null)[]>([]);
  const desktopItemRefs = useRef<(HTMLElement | null)[]>([]);
  const [mobileIndicator, setMobileIndicator] = useState<{ left: number; width: number; height: number } | null>(null);
  const [desktopIndicator, setDesktopIndicator] = useState<{ left: number; width: number; height: number } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0); // State for unread notifications

  const fetchUnreadNotificationsCount = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setUnreadCount(0);
      return;
    }
    try {
      const response = await fetch("/api/notifications/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: token.startsWith("Token ") ? token : `Token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const unread = data.notifications.filter((n: { is_read: boolean; }) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Error fetching unread notifications count:", err);
      setUnreadCount(0);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    fetchUnreadNotificationsCount();
    // Optional: set up polling for new notifications
    const interval = setInterval(fetchUnreadNotificationsCount, 60000); // Poll every 60 seconds
    return () => clearInterval(interval);
  }, [fetchUnreadNotificationsCount]);

  // Read developer-configured visible pages from localStorage
  const devVisiblePages: string[] = useMemo(() => {
    try {
      const raw = localStorage.getItem('dev_nav_visible_pages');
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr)) return arr as string[];
      return [];
    } catch {
      return [];
    }
  }, []);

  const baseNavItems: NavItem[] = [
    { path: "/home", icon: Home },
    { path: "/employee", icon: Users },
    { path: "/employer", icon: Briefcase },
    { path: "/structure", icon: LayoutGrid },
    {
      path: "/team",
      icon: Users,},
    ...(user?.developer ? [{ path: "/calendar", icon: Calendar }] : []),
    {
      path: "/auth",
      icon: isAuthenticated ? (() => (
        <Avatar className="w-6 h-6">
          <AvatarImage src={user?.profile_picture || defaultAvatar} alt={user?.name || user?.username} />
          <AvatarFallback className="text-xs">
            {(user?.name?.substring(0, 2) || user?.username?.substring(0, 2) || 'U').toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )) : User
    },
  ];

  const unauthNavItems: NavItem[] = [
    { path: "/home", icon: Home },
    { path: "/auth", icon: User },
  ];

  // Apply role-based visibility and optional developer override
  const navItems: NavItem[] = !isAuthenticated
    ? unauthNavItems
    : baseNavItems
        .filter(item => {
          const role = user?.team_role;
          const isMember = role === 'Member' || !role;
          const isMod = role === 'Mod';
          const isLeader = role === 'Leader';
          if (item.path === '/employee') {
            return isMember || isMod || isLeader;
          }
          if (isMember) {
            return item.path !== '/employer';
          }
          // Mods and Leaders can see employer
          return true;
        })
        .filter(item => {
          // If the current user is a developer and devVisiblePages is set, only show those paths
          if (user?.developer && devVisiblePages.length > 0) {
            return devVisiblePages.includes(item.path);
          }
          return true;
        });

  useEffect(() => {
    const updateIndicators = () => {
      const activeIndex = navItems.findIndex((it) => it.path === location.pathname);
      if (activeIndex >= 0) {
        const mc = mobileContainerRef.current;
        const mi = mobileItemRefs.current[activeIndex];
        if (mc && mi) {
          const cr = mc.getBoundingClientRect();
          const ir = mi.getBoundingClientRect();
          setMobileIndicator({ left: ir.left - cr.left, width: ir.width, height: ir.height });
        }
        const dc = desktopContainerRef.current;
        const di = desktopItemRefs.current[activeIndex];
        if (dc && di) {
          const cr = dc.getBoundingClientRect();
          const ir = di.getBoundingClientRect();
          setDesktopIndicator({ left: ir.left - cr.left, width: ir.width, height: ir.height });
        }
      }
    };
    updateIndicators();
    window.addEventListener('resize', updateIndicators);
    return () => window.removeEventListener('resize', updateIndicators);
  }, [location.pathname, navItems.length, isAuthenticated]); // Add isAuthenticated to dependencies

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-background p-2 z-10 md:hidden"
      >
        <div ref={mobileContainerRef} className="relative flex justify-around items-center gap-1">
          {mobileIndicator && (
            <span
              className="absolute rounded-xl border border-border bg-accent/20 transition-[left,width,height] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none z-0"
              style={{ left: mobileIndicator.left, width: mobileIndicator.width, height: mobileIndicator.height }}
            />
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const i = navItems.indexOf(item);

            return (
              <Button
                key={item.path}
                variant="ghost"
                size="icon"
                className={`relative z-10 flex-1 h-12 rounded-xl transition-all duration-300 hover:scale-95 active:scale-95 border border-transparent text-foreground shadow-none bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent hover:text-foreground !bg-transparent data-[state=active]:bg-transparent`}
                style={{
                  backgroundColor: 'transparent !important',
                  backgroundImage: 'none',
                  boxShadow: 'none'
                }}
                asChild
                ref={(el) => { mobileItemRefs.current[i] = el as unknown as HTMLElement; }}
              >
                <Link to={item.path} className="flex flex-col items-center justify-center relative">
                  {typeof Icon === 'function' && (Icon as any).prototype && 'render' in (Icon as any).prototype ? (
                    <Icon className={`h-5 w-5`} />
                  ) : (
                    <Icon />
                  )}
                  {item.label && (
                    <span className={`text-xs mt-1 truncate max-w-[60px]`}>
                      {item.label}
                    </span>
                  )}
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>

      <nav 
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-md border border-border rounded-3xl p-1.5 z-10 hidden md:flex"
      >
        <div ref={desktopContainerRef} className="relative flex justify-around items-center space-x-3">
          {desktopIndicator && (
            <span
              className="absolute rounded-xl border border-border bg-accent/20 transition-[left,width,height] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none z-0"
              style={{ left: desktopIndicator.left, width: desktopIndicator.width, height: desktopIndicator.height }}
            />
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const i = navItems.indexOf(item);

            return (
              <Button
                key={item.path}
                variant="ghost"
                size="icon"
                className={`relative z-10 h-14 w-14 rounded-xl transition-all duration-300 hover:scale-95 text-foreground border border-transparent shadow-none bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent hover:text-foreground !bg-transparent data-[state=active]:bg-transparent`}
                style={{
                  backgroundColor: 'transparent !important',
                  backgroundImage: 'none',
                  boxShadow: 'none'
                }}
                asChild
                ref={(el) => { desktopItemRefs.current[i] = el as unknown as HTMLElement; }}
              >
                <Link to={item.path} className="flex flex-col items-center justify-center relative">
                  {typeof Icon === 'function' && (Icon as any).prototype && 'render' in (Icon as any).prototype ? (
                    <Icon className={`h-7 w-7`} />
                  ) : (
                    <Icon />
                  )}
                  {item.label && (
                    <span className={`text-xs mt-1 truncate max-w-[60px]`}>
                      {item.label}
                    </span>
                  )}
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
