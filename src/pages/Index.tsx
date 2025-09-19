import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Utensils,
  Bed,
  Wine,
  Sparkles
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const Index = () => {
  const { data: rooms = [] } = useQuery({
    queryKey: ["hotel", "rooms"],
    queryFn: () => api.get<any[]>("/hotel/rooms"),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["hotel", "reservations", today],
    queryFn: () => api.get<any[]>(`/hotel/reservations?date=${today}`),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const { data: revenueTotal = 0 } = useQuery({
    queryKey: ["reports", "daily-total", today],
    queryFn: async () => {
      const depts = ["hotel", "restaurant", "pub", "spa"] as const;
      const res = await Promise.all(
        depts.map((d) => api.get<{ total: number }>(`/reports/daily?dept=${d}&date=${today}`))
      );
      return res.reduce((s, r) => s + (r?.total || 0), 0);
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const { data: ordersOpen = [] } = useQuery({
    queryKey: ["restaurant", "orders", "open"],
    queryFn: () => api.get<any[]>(`/restaurant/orders?status=open`),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["restaurant", "tables"],
    queryFn: () => api.get<any[]>(`/restaurant/tables`),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    staleTime: 15000,
  });

  const startOfDay = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0);
  const endOfDay = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 0, 0, 0);
  const { data: spaToday = [] } = useQuery({
    queryKey: ["spa", "appointments", today],
    queryFn: () => api.get<any[]>(`/spa/appointments?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 7000,
  });

  const occupiedRooms = rooms.filter((r: any) => r.status === "occupied").length;
  const totalRooms = rooms.length || 0;
  const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const presentGuests = reservations.filter((r: any) => r.status === "checked_in").length;

  const openOrdersCount = ordersOpen.length;

  const totalTablesRestaurant = tables.filter((t: any) => t.department === "restaurant").length;
  const usedTablesRestaurant = new Set(
    ordersOpen.filter((o: any) => o.dept === "restaurant" && o.tableId).map((o: any) => o.tableId)
  ).size;

  const totalTablesPub = tables.filter((t: any) => t.department === "pub").length;
  const usedTablesPub = new Set(
    ordersOpen.filter((o: any) => o.dept === "pub" && o.tableId).map((o: any) => o.tableId)
  ).size;

  const formatAr = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} Ar`;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">GoldenKey Hotel</h1>
            <p className="text-sm md:text-base text-muted-foreground">Plateforme de gestion complète • Vue d'ensemble temps réel</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <StatCard title="Clients Présents" value={presentGuests} icon={Users} variant="default" />
            <StatCard title="Revenus Journaliers" value={formatAr(revenueTotal)} icon={DollarSign} variant="gold" />
            <StatCard title="Taux d'Occupation" value={`${occupancyRate}%`} icon={TrendingUp} variant="success" />
            <StatCard title="Commandes Actives" value={openOrdersCount} icon={Clock} variant="warning" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <StatCard title="Chambres Occupées" value={`${occupiedRooms}/${totalRooms}`} icon={Bed} variant="default" />
            <StatCard title="Tables Restaurant" value={`${usedTablesRestaurant}/${totalTablesRestaurant}`} icon={Utensils} variant="default" />
            <StatCard title="Bar - Tables" value={`${usedTablesPub}/${totalTablesPub}`} icon={Wine} variant="default" />
            <StatCard title="RDV Spa Aujourd'hui" value={spaToday.length} icon={Sparkles} variant="default" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <QuickActions />
            <RecentActivity />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
