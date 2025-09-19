import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReactNode } from "react";

// Import des pages
import Index from "./pages/Index";
import Hotel from "./pages/Hotel";
import Restaurant from "./pages/Restaurant";
import Pub from "./pages/Pub";
import Spa from "./pages/Spa";
import NotFound from "./pages/NotFound";
import HotelPlan from "./pages/HotelPlan";
import RestaurantKDS from "./pages/RestaurantKDS";
import BarDisplay from "./pages/BarDisplay";
import BarPOS from "./pages/BarPOS";
import SpaAgenda from "./pages/SpaAgenda";
import Inventory from "./pages/Inventory";
import Cash from "./pages/Cash";
import Reports from "./pages/Reports";
import RestaurantPOS from "./pages/RestaurantPOS";
import Housekeeping from "./pages/Housekeeping";
import RoomInspection from "./pages/RoomInspection";
import Settings from "./pages/Settings";
import RoomsManage from "./pages/RoomsManage";
import Team from "./pages/Team";
import Notifications from "./pages/Notifications";
import RestaurantMenu from "./pages/RestaurantMenu";
import PubMenu from "./pages/PubMenu";
import DailyInvoice from "./pages/DailyInvoice";
import LoginPage from "./pages/LoginPage";
import Reservations from "./pages/Reservations";
import CRM from "./pages/CRM";

// Import des providers et hooks
import { AuthProvider, useAuth } from "./lib/rbac";
import { AppStateProvider } from "./state/AppState";
import { ThemeProvider } from "next-themes";
import ScrollKeeper from "./components/scroll-keeper";

const queryClient = new QueryClient();

// Composant pour protéger les routes
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Composant pour les routes publiques (redirection si déjà connecté)
const PublicRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Composant Layout pour les pages authentifiées
const AuthenticatedLayout = ({ children }: ProtectedRouteProps) => {
  return (
    <>
      <ScrollKeeper />
      {children}
      <div className="md:fixed md:left-64 md:right-0 md:bottom-0 h-10 w-full bg-card border-t border-border px-4 flex items-center justify-center text-sm">
        <div>Copyright © {new Date().getFullYear()}. Tous droits réservés</div>
      </div>
    </>
  );
};

// Composant principal des routes authentifiées
const AuthenticatedRoutes = () => (
  <AuthenticatedLayout>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/hotel" element={<Hotel />} />
      <Route path="/reservations" element={<Reservations />} />
      <Route path="/hotel/plan" element={<HotelPlan />} />
      <Route path="/restaurant" element={<Restaurant />} />
      <Route path="/restaurant/kds" element={<RestaurantKDS />} />
      <Route path="/restaurant/pos" element={<RestaurantPOS />} />
      <Route path="/restaurant/menu" element={<RestaurantMenu />} />
      <Route path="/pub/menu" element={<PubMenu />} />
      <Route path="/pub" element={<Pub />} />
      <Route path="/bar" element={<BarDisplay />} />
      <Route path="/bar/pos" element={<BarPOS />} />
      <Route path="/spa" element={<Spa />} />
      <Route path="/spa/agenda" element={<SpaAgenda />} />
      <Route path="/crm" element={<CRM />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/invoices/daily" element={<DailyInvoice />} />
      <Route path="/cash" element={<Cash />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/housekeeping" element={<Housekeeping />} />
      <Route path="/room-inspection" element={<RoomInspection />} />
      <Route path="/rooms/manage" element={<RoomsManage />} />
      <Route path="/team" element={<Team />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      {/* Route pour les pages non trouvées */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthenticatedLayout>
);

// Composant principal de l'application
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <AppStateProvider>
            <BrowserRouter>
              <Routes>
                {/* Route publique pour la connexion */}
                <Route 
                  path="/login" 
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  } 
                />
                
                {/* Routes protégées */}
                <Route 
                  path="/*" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedRoutes />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </BrowserRouter>
          </AppStateProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
