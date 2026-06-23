import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { type ReactNode, useEffect } from "react";
import Navbar from "@/components/navbar";
import Home from "@/pages/home";
import AuthPage from "@/auth/authpage";
import Planner from "@/pages/planner";
import Calendar from "@/pages/calendar";
import NotFound from "@/pages/notfound";
import EmployeePage from "@/pages/employee";
import EmployerPage from "@/pages/employer";
import TeamPage from "@/pages/team";
import Settings from "@/pages/Settings";
import SubmissionsManagement from "@/pages/submissions-management";
import Structure from "@/pages/structure";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <ConsoleGate />
      <Router>
        <RoutePersister />
        <div className="relative min-h-screen">
          <div style={{ position: "relative" }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/planner" element={<Planner />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/employee" element={<RequireMember><EmployeePage /></RequireMember>} />
              <Route path="/employer" element={<RequireRole roles={["Leader", "Mod"]}><EmployerPage /></RequireRole>} />
              <Route path="/team" element={<RequireValidated><TeamPage /></RequireValidated>} />
              <Route path="/settings" element={<RequireValidated><Settings /></RequireValidated>} />
              <Route path="/submissions" element={<RequireRole roles={["Leader", "Mod"]}><SubmissionsManagement /></RequireRole>} />
              <Route path="/structure" element={<RequireValidated><Structure /></RequireValidated>} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Navbar />
            <Toaster position="top-right" richColors />
          </div>
        </div>
      </Router>
    </>
  );
}

function RoutePersister() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== "/auth") {
      localStorage.setItem("last_visited_path", location.pathname);
    }
  }, [location]);

  useEffect(() => {
    const lastPath = localStorage.getItem("last_visited_path");
    if (lastPath && location.pathname === "/" && lastPath !== "/") {
      navigate(lastPath);
    }
  }, []);

  return null;
}

export default App;

function RequireValidated({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!user?.is_validate) return <Navigate to="/calendar" replace />;
  return children;
}

function RequireRole({ children, roles }: { children: ReactNode, roles: string[] }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!user?.is_validate) return <Navigate to="/calendar" replace />;
  
  if (user?.developer) return children;
  
  if (!user?.team_role || !roles.includes(user.team_role)) return <Navigate to="/employee" replace />;
  return children;
}

function RequireMember({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!user?.is_validate) return <Navigate to="/calendar" replace />;
  if (user?.developer) return children;
  const role = user?.team_role;
  const isMember = role === 'Member' || !role;
  const isMod = role === 'Mod';
  const isLeader = role === 'Leader';
  if (!(isMember || isMod || isLeader)) return <Navigate to="/home" replace />;
  return children;
}

function ConsoleGate() {
  const { user } = useAuth();
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalDebug = console.debug;
    const isDev = !!user?.developer;
    console.error = isDev ? originalError : (..._args: any[]) => {};
    console.warn = isDev ? originalWarn : (..._args: any[]) => {};
    console.debug = isDev ? originalDebug : (..._args: any[]) => {};
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.debug = originalDebug;
    };
  }, [user?.developer]);
  return null;
}
