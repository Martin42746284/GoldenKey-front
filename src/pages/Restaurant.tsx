import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UtensilsCrossed,
  Clock,
  CheckCircle,
  Package,
  DollarSign,
  ChefHat,
  ClipboardList,
  TrendingUp,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const Restaurant = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: openOrders = [], isLoading: loadingOpen } = useQuery({ queryKey: ["restaurant","orders","open"], queryFn: () => api.get<any[]>("/restaurant/orders?dept=restaurant&status=open") });
  const { data: allOrders = [], isLoading: loadingAll } = useQuery({ queryKey: ["restaurant","orders","all"], queryFn: () => api.get<any[]>("/restaurant/orders?dept=restaurant") });
  const { data: tables = [], isLoading: loadingTables } = useQuery({ queryKey: ["restaurant","tables"], queryFn: () => api.get<any[]>("/restaurant/tables") });

  const reportsToday = useQuery({ queryKey: ["reports","daily","restaurant"], queryFn: () => api.get<any>(`/reports/daily?dept=restaurant&date=${new Date().toISOString().slice(0,10)}`), enabled: true });

  const deleteOrder = useMutation({ mutationFn: (id:number) => api.del(`/restaurant/orders/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["restaurant","orders","all"] }); toast({ title: 'Commande supprimée' }); }, onError: (e:any)=> toast({ title:'Erreur suppression', description: String(e), variant:'destructive' }) });

  const closeOrder = useMutation({ mutationFn: (orderId:number) => api.post(`/restaurant/orders/${orderId}/close`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["restaurant","orders","open"] }); qc.invalidateQueries({ queryKey: ["restaurant","orders","all"] }); toast({ title: 'Commande clôturée' }); }, onError: (e:any)=> toast({ title:'Erreur', description: String(e), variant:'destructive' }) });

  const getStatusBadge = (status: string) => {
    const styles = {
      open: "bg-warning/10 text-warning border-warning/20",
      closed: "bg-success/10 text-success border-success/20",
      cancelled: "bg-muted text-muted-foreground border-muted",
    } as Record<string,string>;

    const labels: Record<string,string> = { open: 'Active', closed: 'Fermée', cancelled: 'Annulée' };

    return (
      <Badge variant="outline" className={styles[status] || styles.open}>{labels[status] || labels.open}</Badge>
    );
  };

  const occupiedTableCodes = Array.from(new Set(openOrders.map((o:any)=> o.table?.code).filter(Boolean)));
  const totalTables = tables.length || 0;
  const activeOrders = openOrders.length || 0;
  const dailyRevenue = reportsToday.data?.total ?? 0;
  const dishesServed = (allOrders || [])
    .filter((o:any)=> o.status === 'closed')
    .reduce((sum:number, o:any)=> sum + (o.lines?.reduce((s:number,l:any)=> s + (l.qty||0), 0) || 0), 0);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Restaurant
            </h1>
            <p className="text-muted-foreground">
              Commandes • Cuisine • Inventaire • Caisse
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Tables Occupées"
              value={`${occupiedTableCodes.length}/${totalTables}`}
              icon={UtensilsCrossed}
              variant="default"
            />
            <StatCard
              title="Commandes Actives"
              value={String(activeOrders)}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="CA Aujourd'hui"
              value={`${new Intl.NumberFormat('fr-FR').format(dailyRevenue)} Ar`}
              icon={DollarSign}
              variant="gold"
            />
            <StatCard
              title="Plats Servis"
              value={String(dishesServed)}
              icon={CheckCircle}
              variant="success"
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
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/restaurant/pos')}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Nouvelle Commande
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/restaurant/kds')}>
                  <ChefHat className="mr-2 h-4 w-4" />
                  Vue Cuisine
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/inventory')}>
                  <Package className="mr-2 h-4 w-4" />
                  Inventaire
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/cash')}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Caisse
                </Button>
              </CardContent>
            </Card>

            {/* Active Orders */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Commandes Actives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {openOrders.map((order:any) => (
                    <div
                      key={order.id}
                      className="p-4 border border-border rounded-lg hover:shadow-elegant transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <UtensilsCrossed className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{order.id} - {order.table?.code || order.table?.name || order.tableId || 'N/A'}</span>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {order.lines?.map((l:any)=> `${l.itemName} × ${l.qty}`).join(', ')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{new Date(order.openedAt || order.opened_at || Date.now()).toLocaleTimeString('fr-FR')}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gold">{new Intl.NumberFormat('fr-FR').format(order.lines?.reduce((s:any,l:any)=> s + (l.unitPrice||0)*l.qty,0) || 0)} Ar</span>
                          <Button size="sm" variant="outline" onClick={()=>closeOrder.mutate(order.id)}>Clôturer</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {openOrders.length===0 && <div className="text-sm text-muted-foreground">Aucune commande active</div>}
                </div>
              </CardContent>
            </Card>

            {/* Closed Orders */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Commandes Clôturées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(allOrders || []).filter((o:any)=> o.status === 'closed').slice(0, 20).map((order:any) => (
                    <div key={order.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <UtensilsCrossed className="h-4 w-4 text-success" />
                          <span className="font-semibold">{order.id} - {order.table?.code || order.table?.name || order.tableId || 'N/A'}</span>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {order.lines?.map((l:any)=> `${l.itemName} × ${l.qty}`).join(', ')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{new Date(order.closedAt || order.closed_at || Date.now()).toLocaleString('fr-FR')}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{new Intl.NumberFormat('fr-FR').format(order.lines?.reduce((s:any,l:any)=> s + (l.unitPrice||0)*l.qty,0) || 0)} Ar</span>
                          <Button size="sm" variant="destructive" onClick={()=> { if(confirm('Supprimer cette commande ?')) deleteOrder.mutate(order.id); }}>
                            <Trash2 className="h-4 w-4 mr-1"/> Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(allOrders || []).filter((o:any)=> o.status === 'closed').length===0 && <div className="text-sm text-muted-foreground">Aucune commande clôturée</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Restaurant;
