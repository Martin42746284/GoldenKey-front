import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bed, Clock, AlertTriangle, Sparkles, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Reports() {
  const { data: rooms = [] } = useQuery({ queryKey: ["hotel","rooms"], queryFn: () => api.get<any[]>("/hotel/rooms") });
  const { data: orders = [] } = useQuery({ queryKey: ["orders","restaurant","open"], queryFn: () => api.get<any[]>(`/restaurant/orders?dept=restaurant&status=open`) });
  const { data: tabs = [] } = useQuery({ queryKey: ["bar","tabs"], queryFn: () => api.get<any[]>("/bar/tabs") });
  const today = new Date().toISOString().slice(0,10);
  const { data: spaDaily = { total: 0 } } = useQuery({ queryKey: ["reports","spa", today], queryFn: ()=> api.get<{ total: number }>(`/reports/daily?dept=spa&date=${today}`) });

  const occupied = rooms.filter((r: any) => r.status === 'occupied').length;
  const occRate = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const activeOrders = orders.filter((o: any) => o.status === 'open').length;
  const unpaidTabs = tabs.filter((t: any) => t.status === 'unpaid');
  const unpaidTotal = unpaidTabs.reduce((s: number, t: any) => s + (t.balance || 0), 0);
  const spaTodayRevenue = (spaDaily?.total || 0);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Rapports (MVP)</h1>
            <p className="text-muted-foreground">KPIs clés en temps réel</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Taux d'Occupation" value={`${occRate}%`} icon={TrendingUp} variant="success" />
            <StatCard title="Chambres Occupées" value={`${occupied}/${rooms.length}`} icon={Bed} variant="default" />
            <StatCard title="Commandes Actives" value={`${activeOrders}`} icon={Clock} variant="warning" />
            <StatCard title="Tabs Impayés" value={`${new Intl.NumberFormat('fr-FR').format(unpaidTotal)} Ar`} icon={AlertTriangle} variant="warning" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Restaurant — Répartition statuts</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>Commandé: {orders.flatMap((o:any)=>o.lines).filter((l:any)=>(l.fireStatus||l.fire_status)==='commanded').length}</div>
                <div>En préparation: {orders.flatMap((o:any)=>o.lines).filter((l:any)=>(l.fireStatus||l.fire_status)==='preparing').length}</div>
                <div>Prêt: {orders.flatMap((o:any)=>o.lines).filter((l:any)=>(l.fireStatus||l.fire_status)==='ready').length}</div>
                <div>Livré: {orders.flatMap((o:any)=>o.lines).filter((l:any)=>(l.fireStatus||l.fire_status)==='delivered').length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5"/> Spa — Chiffre du jour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Intl.NumberFormat('fr-FR').format(spaTodayRevenue)} Ar</div>
                <div className="text-sm text-muted-foreground">Somme des prestations terminées</div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
