import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wine,
  Clock,
  CheckCircle,
  Package,
  DollarSign,
  AlertTriangle,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useMemo } from "react";

const Pub = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: tabs = [] } = useQuery({ queryKey: ["bar","tabs"], queryFn: () => api.get<any[]>("/bar/tabs"), refetchInterval: 10000 });

  const { data: tables = [] } = useQuery({ queryKey: ["restaurant","tables"], queryFn: () => api.get<any[]>("/restaurant/tables"), staleTime: 15000 });
  const { data: openOrders = [] } = useQuery({ queryKey: ["pub","orders","open"], queryFn: () => api.get<any[]>("/restaurant/orders?dept=pub&status=open"), refetchInterval: 5000, staleTime: 2000 });

  const today = new Date();
  const ymd = new Date(today.getTime() - today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const { data: pubDaily = { total: 0 } } = useQuery({ queryKey: ["reports","pub", ymd], queryFn: ()=> api.get<{ total:number }>(`/reports/daily?dept=pub&date=${ymd}`), refetchInterval: 30000, staleTime: 10000 });

  const stats = useMemo(() => {
    const pubTables = (tables || []).filter((t:any)=> (t.department||t.dept||'') === 'pub');
    const usedTables = new Set((openOrders||[]).filter((o:any)=> o.tableId).map((o:any)=> o.tableId)).size;
    const openTabs = (tabs||[]).filter((t:any)=> (t.status||'') === 'open').length;
    const unpaidTotal = (tabs||[]).filter((t:any)=> (t.status||'') === 'unpaid').reduce((s:number, t:any)=> s + (t.balance||0), 0);
    return { tablesOccupied: `${usedTables}/${pubTables.length}`, openTabs, dailyTotal: pubDaily?.total||0, unpaidTotal };
  }, [tables, openOrders, tabs, pubDaily]);

  const createTab = useMutation({ mutationFn: (name:string) => api.post('/bar/tabs', { customerName: name }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['bar','tabs'] }); toast({ title: 'Ardoise créée' }); } });


  const getStatusBadge = (status: string) => {
    const styles = {
      paid: "bg-success/10 text-success border-success/20",
      unpaid: "bg-destructive/10 text-destructive border-destructive/20",
      open: "bg-warning/10 text-warning border-warning/20",
    } as Record<string,string>;

    const labels = {
      paid: "Payé",
      unpaid: "Impayé",
      open: "Ouvert",
    } as Record<string,string>;

    return (
      <Badge variant="outline" className={styles[status] || styles.open}>
        {labels[status] || labels.open}
      </Badge>
    );
  };



  const openNewTab = async () => {
    const name = window.prompt('Nom client (optionnel)') || 'Client';
    createTab.mutate(name);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Pub/Bar
            </h1>
            <p className="text-muted-foreground">
              Commandes • Inventaire • Gestion des tabs • Paiement uniquement dans Bar POS
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Tables Occupées"
              value={stats.tablesOccupied}
              icon={Wine}
              variant="default"
            />
            <StatCard
              title="Tabs Ouvertes"
              value={String(stats.openTabs)}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="CA Soirée"
              value={`${new Intl.NumberFormat('fr-FR').format(stats.dailyTotal)} Ar`}
              icon={DollarSign}
              variant="gold"
            />
            <StatCard
              title="Impayés"
              value={`${new Intl.NumberFormat('fr-FR').format(stats.unpaidTotal)} Ar`}
              icon={AlertTriangle}
              variant="warning"
            />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/bar')}>
                  <Wine className="mr-2 h-4 w-4" />
                  Nouvelle Commande
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/bar/pos')}>
                  Aller à Bar POS (paiement)
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/inventory')}>
                  <Package className="mr-2 h-4 w-4" />
                  Inventaire Bar
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/bar')}>
                  <Users className="mr-2 h-4 w-4" />
                  Gestion Tables
                </Button>
              </CardContent>
            </Card>

            {/* Active Tabs */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tabs Actives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tabs.map((tab:any) => (
                    <div
                      key={tab.id}
                      className="p-4 border border-border rounded-lg hover:shadow-elegant transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Wine className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{tab.customerName || tab.customer_name || `Tab ${tab.id}`}</span>
                        </div>
                        {getStatusBadge(tab.status)}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {/* optional: show orders summary */}
                        {tab.orders?.length ? tab.orders.map((o:any)=> `#${o.id}`).join(', ') : ''}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Solde: {new Intl.NumberFormat('fr-FR').format(tab.balance || 0)} MGA</span>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" onClick={()=> navigate('/bar/pos')} disabled={(tab.status || '') === 'paid'}>
                            {(tab.status || '') === 'paid' ? 'Déjà payé' : 'Payer dans Bar POS'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {tabs.length === 0 && <div className="text-sm text-muted-foreground">Aucune ardoise</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Pub;
