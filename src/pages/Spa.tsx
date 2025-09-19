import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles,
  Calendar,
  Clock,
  Package,
  DollarSign,
  User,
  CheckCircle,
  AlertCircle,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const Spa = () => {
  const qc = useQueryClient();
  const today = new Date();
  const ymd = new Date(today.getTime() - today.getTimezoneOffset()*60000).toISOString().slice(0,10);

  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0);
  const { data: appointments = [] } = useQuery({
    queryKey: ["spa", "appointments", ymd],
    queryFn: () => api.get<any[]>(`/spa/appointments?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["spa","services"],
    queryFn: () => api.get<any[]>(`/spa/services`),
    staleTime: 60000,
  });

  const { data: revenue = { total: 0 } } = useQuery({
    queryKey: ["reports", "spa", ymd],
    queryFn: () => api.get<{ total: number }>(`/reports/daily?dept=spa&date=${ymd}`),
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const startMut = useMutation({
    mutationFn: (id: number) => api.patch(`/spa/appointments/${id}/status`, { status: "in_progress" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["spa","appointments", ymd] }); toast({ title: "RDV démarré" }); },
    onError: (e:any) => toast({ title: "Erreur", description: String(e), variant: "destructive" })
  });
  const completeMut = useMutation({
    mutationFn: (id: number) => api.patch(`/spa/appointments/${id}/status`, { status: "completed" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["spa","appointments", ymd] }); toast({ title: "RDV terminé" }); },
    onError: (e:any) => toast({ title: "Erreur", description: String(e), variant: "destructive" })
  });
  const noShowMut = useMutation({
    mutationFn: (id: number) => api.patch(`/spa/appointments/${id}/status`, { status: "no_show" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["spa","appointments", ymd] }); toast({ title: "No-show enregistré" }); },
    onError: (e:any) => toast({ title: "Erreur", description: String(e), variant: "destructive" })
  });
  const payMut = useMutation({
    mutationFn: (p: { id:number; amount:number; method:'cash'|'card'|'mobile'|'bank' }) => api.post(`/spa/appointments/${p.id}/pay`, { amount: p.amount, method: p.method }),
    onSuccess: () => { toast({ title: 'Encaissement', description: 'Paiement enregistré.' }); },
    onError: (e:any) => toast({ title: 'Erreur', description: String(e), variant: 'destructive' })
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.del(`/spa/appointments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["spa","appointments", ymd] }); toast({ title: "RDV supprimé" }); },
    onError: (e:any) => toast({ title: "Erreur", description: String(e), variant: "destructive" })
  });

  const [showNew, setShowNew] = useState(false);
  const [showDetails, setShowDetails] = useState<{ open: boolean; app: any | null }>({ open: false, app: null });
  const [newApp, setNewApp] = useState({
    clientName: "",
    serviceName: "",
    start: "",
    durationMin: 60,
    price: 0,
    room: "",
  });
  const createMut = useMutation({
    mutationFn: () => api.post(`/spa/appointments`, {
      clientName: newApp.clientName,
      serviceName: newApp.serviceName,
      start: new Date(newApp.start).toISOString(),
      durationMin: Number(newApp.durationMin),
      price: Math.max(0, Math.floor(Number(newApp.price))),
      room: newApp.room || undefined,
    }),
    onSuccess: () => {
      setShowNew(false);
      setNewApp({ clientName: "", serviceName: "", start: "", durationMin: 60, price: 0, room: "" });
      qc.invalidateQueries({ queryKey: ["spa","appointments", ymd] });
      toast({ title: "RDV créé" });
    },
    onError: (e:any) => toast({ title: "Erreur", description: String(e), variant: "destructive" })
  });

  const stats = useMemo(() => {
    const countToday = appointments.length;
    const inProgress = appointments.filter((a:any) => a.status === 'in_progress').length;
    const totalMinutes = appointments.reduce((s:number, a:any) => s + (a.durationMin || 0), 0);
    const capacityMin = 8 * 60; // journée de 8h
    const occupancy = capacityMin ? Math.min(100, Math.round((totalMinutes / capacityMin) * 100)) : 0;
    return { countToday, inProgress, occupancy };
  }, [appointments]);

  const getStatusBadge = (status: string) => {
    const styles = {
      booked: "bg-success/10 text-success border-success/20",
      in_progress: "bg-primary/10 text-primary border-primary/20",
      waiting: "bg-warning/10 text-warning border-warning/20",
      completed: "bg-muted text-muted-foreground border-muted",
      no_show: "bg-warning/20 text-warning border-warning/30",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    } as Record<string,string>;

    const labels = {
      booked: "Confirmé",
      in_progress: "En cours",
      waiting: "En attente",
      completed: "Terminé",
      no_show: "No-show",
      cancelled: "Annulé",
    } as Record<string,string>;

    const k = status as keyof typeof styles;
    return (
      <Badge variant="outline" className={styles[k] || styles.booked}>
        {labels[k] || status}
      </Badge>
    );
  };

  const navigate = useNavigate();
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Spa & Onglerie
            </h1>
            <p className="text-muted-foreground">
              Planning • Prestations • Inventaire • Paiements
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="RDV Aujourd'hui" value={stats.countToday} icon={Calendar} variant="default" />
            <StatCard title="En cours" value={stats.inProgress} icon={Clock} variant="default" />
            <StatCard title="CA Journée" value={`${Math.round((revenue?.total||0)).toLocaleString('fr-FR')} Ar`} icon={DollarSign} variant="gold" />
            <StatCard title="Taux Occupation" value={`${stats.occupancy}%`} icon={CheckCircle} variant="success" />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" onClick={()=>setShowNew(true)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Nouveau RDV
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/spa/agenda')}>
                  <User className="mr-2 h-4 w-4" />
                  Fiche Client
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/inventory')}>
                  <Package className="mr-2 h-4 w-4" />
                  Inventaire Produits
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/cash')}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Encaissement
                </Button>
              </CardContent>
            </Card>

            {/* Today's Appointments */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Planning du Jour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((a: any) => {
                    const time = new Date(a.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={a.id} className="p-4 border border-border rounded-lg hover:shadow-elegant transition-all duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{time} - {a.clientName}</span>
                          </div>
                          {getStatusBadge(a.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          <div>{a.serviceName}{a.room ? ` • Salle: ${a.room}` : ''}</div>
                          <div>Durée: {a.durationMin} min</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gold">{`${(a.price||0).toLocaleString('fr-FR')} Ar`}</span>
                          <div className="flex items-center space-x-2">
                            {a.status === "waiting" && (
                              <Button size="sm" variant="outline" onClick={()=>startMut.mutate(a.id)}>Commencer</Button>
                            )}
                            {a.status === "in_progress" && (
                              <Button size="sm" variant="outline" onClick={()=>completeMut.mutate(a.id)}>Terminer</Button>
                            )}
                            {a.status === "booked" && (
                              <>
                                <Button size="sm" variant="ghost" onClick={()=>startMut.mutate(a.id)}>Démarrer</Button>
                                <Button size="sm" variant="outline" onClick={()=>noShowMut.mutate(a.id)}>No-show</Button>
                              </>
                            )}
                            {(a.status === "in_progress" || a.status === "completed") && (
                              <Button size="sm" variant="outline" onClick={()=>payMut.mutate({ id: a.id, amount: a.price || 0, method: 'cash' })}>Encaisser</Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={()=>setShowDetails({ open: true, app: a })}>Détails</Button>
                            {((['completed','cancelled','no_show'] as const).includes(a.status) || (new Date(a.start).getTime() + (a.durationMin||0)*60000) < Date.now()) && (
                              <Button size="sm" variant="destructive" onClick={()=>{
                                if (confirm('Supprimer ce RDV ?')) deleteMut.mutate(a.id);
                              }}>
                                <Trash2 className="h-4 w-4 mr-1"/> Supprimer
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Nouveau RDV</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client</Label>
                  <Input id="clientName" value={newApp.clientName} onChange={(e)=>setNewApp({ ...newApp, clientName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceName">Prestation</Label>
                  {services.length ? (
                    <Select onValueChange={(id)=>{
                      const s = services.find((x:any)=> String(x.id) === id);
                      if (s) setNewApp({ ...newApp, serviceName: s.name, durationMin: s.durationMin, price: s.salePrice });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder={newApp.serviceName || 'Choisir un service'} />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s:any)=>(
                          <SelectItem key={s.id} value={String(s.id)}>{s.name} • {s.salePrice.toLocaleString('fr-FR')} Ar</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input id="serviceName" value={newApp.serviceName} onChange={(e)=>setNewApp({ ...newApp, serviceName: e.target.value })} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Date & heure</Label>
                    <Input id="start" type="datetime-local" value={newApp.start} onChange={(e)=>setNewApp({ ...newApp, start: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durée (min)</Label>
                    <Input min={0} id="duration" type="number" value={newApp.durationMin} onChange={(e)=>setNewApp({ ...newApp, durationMin: Number(e.target.value)||0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (MGA)</Label>
                    <Input min={0} id="price" type="number" value={newApp.price} onChange={(e)=>setNewApp({ ...newApp, price: Number(e.target.value)||0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Salle</Label>
                    <Input id="room" value={newApp.room} onChange={(e)=>setNewApp({ ...newApp, room: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={()=>setShowNew(false)}>Annuler</Button>
                  <Button onClick={()=>createMut.mutate()} disabled={!newApp.clientName || !newApp.serviceName || !newApp.start || !newApp.durationMin || !newApp.price}>Créer</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showDetails.open} onOpenChange={(o)=>setShowDetails(({ app })=>({ open: o, app }))}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Fiche Client</DialogTitle>
              </DialogHeader>
              {showDetails.app && (
                <div className="grid gap-2 py-2 text-sm">
                  <div className="font-semibold text-lg">{showDetails.app.clientName}</div>
                  <div>Prestation: {showDetails.app.serviceName}</div>
                  <div>Date: {new Date(showDetails.app.start).toLocaleString('fr-FR')}</div>
                  <div>Durée: {showDetails.app.durationMin} min</div>
                  {showDetails.app.room && <div>Salle: {showDetails.app.room}</div>}
                  <div>Prix: {(showDetails.app.price||0).toLocaleString('fr-FR')} Ar</div>
                  <div>Statut: {getStatusBadge(showDetails.app.status)}</div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default Spa;
