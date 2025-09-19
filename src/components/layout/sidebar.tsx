import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Hotel,
  UtensilsCrossed,
  Wine,
  Sparkles,
  BarChart3,
  Settings,
  Bell,
  Users,
  LayoutGrid,
  ChefHat,
  CalendarDays,
  Package as PackageIcon,
  DollarSign as DollarIcon,
  CheckCircle2 as CheckIcon
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Hôtel", href: "/hotel", icon: Hotel },
  { name: "Réservations", href: "/reservations", icon: CalendarDays },
  { name: "Plan Chambres", href: "/hotel/plan", icon: LayoutGrid },
  { name: "Gestion Chambres", href: "/rooms/manage", icon: LayoutGrid },
  { name: "Restaurant", href: "/restaurant", icon: UtensilsCrossed },
  { name: "POS Restaurant", href: "/restaurant/pos", icon: UtensilsCrossed },
  { name: "Menu Restaurant", href: "/restaurant/menu", icon: UtensilsCrossed },
  { name: "KDS Cuisine", href: "/restaurant/kds", icon: ChefHat },
  { name: "Pub/Bar", href: "/pub", icon: Wine },
  { name: "Menu Pub", href: "/pub/menu", icon: Wine },
  { name: "Bar Display", href: "/bar", icon: Wine },
  { name: "Bar POS", href: "/bar/pos", icon: Wine },
  { name: "Spa & Onglerie", href: "/spa", icon: Sparkles },
  { name: "Agenda Spa", href: "/spa/agenda", icon: CalendarDays },
  { name: "CRM & Clients", href: "/crm", icon: Users },
  { name: "Inventaire", href: "/inventory", icon: PackageIcon },
  { name: "Facture journalière", href: "/invoices/daily", icon: DollarIcon },
  { name: "Caisse", href: "/cash", icon: DollarIcon },
  { name: "Rapports", href: "/reports", icon: BarChart3 },
  { name: "Housekeeping", href: "/housekeeping", icon: Sparkles },
  // { name: "Inspection", href: "/room-inspection", icon: CheckIcon },
  // { name: "Équipe", href: "/team", icon: Users },
];

const ICON_COLORS: Record<string, string> = {
  "/": "text-blue-500",
  "/hotel": "text-emerald-500",
  "/reservations": "text-blue-600",
  "/hotel/plan": "text-indigo-500",
  "/rooms/manage": "text-violet-500",
  "/restaurant": "text-rose-500",
  "/restaurant/pos": "text-pink-500",
  "/restaurant/menu": "text-pink-500",
  "/restaurant/kds": "text-orange-500",
  "/pub": "text-amber-500",
  "/pub/menu": "text-amber-500",
  "/bar": "text-yellow-500",
  "/bar/pos": "text-yellow-500",
  "/spa": "text-fuchsia-500",
  "/spa/agenda": "text-purple-500",
  "/crm": "text-green-600",
  "/inventory": "text-cyan-500",
  "/invoices/daily": "text-lime-500",
  "/cash": "text-lime-500",
  "/reports": "text-teal-500",
  "/housekeeping": "text-sky-500",
  "/room-inspection": "text-red-500",
  "/team": "text-stone-500",
  "/notifications": "text-orange-400",
  "/settings": "text-zinc-500",
};

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div data-sidebar="sidebar" className="hidden md:flex min-h-screen w-64 flex-col bg-[hsl(var(--sidebar-background)/0.6)] backdrop-blur-md border-r border-border">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-border sticky top-0 z-10 bg-[hsl(var(--sidebar-background)/0.6)] backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Hotel className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">GoldenKey Hotel</h1>
            <p className="text-xs text-muted-foreground">Gestion Premium</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 overflow-hidden">
        <div className="h-full overflow-y-auto pr-2 pb-2" style={{ scrollbarGutter: "stable" }}>
          <ul className="flex flex-col gap-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Button
                    aria-current={isActive ? "page" : undefined}
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start px-3 transition-all duration-200 text-base flex items-center gap-3 truncate",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-elegant border-l-4 border-primary"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => navigate(item.href)}
                  >
                    <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : ICON_COLORS[item.href] ?? "text-sidebar-foreground")} />
                    <span className="truncate">{item.name}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto p-4 border-t border-border space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-base"
          onClick={() => navigate("/notifications")}
        >
          <Bell className={cn("mr-3 h-5 w-5", ICON_COLORS["/notifications"]) } />
          Notifications
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-base"
          onClick={() => navigate("/settings")}
        >
          <Settings className={cn("mr-3 h-5 w-5", ICON_COLORS["/settings"]) } />
          Paramètres
        </Button>
      </div>
    </div>
  );
}
