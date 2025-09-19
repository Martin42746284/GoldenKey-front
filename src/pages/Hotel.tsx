import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bed,
  Users,
  ClipboardCheck,
  Package,
  UserPlus,
  UserMinus,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: rooms = [] } = useQuery({ queryKey: ["hotel","rooms"], queryFn: () => api.get<any[]>("/hotel/rooms") });

  const getStatusBadge = (status: string) => {
    const styles = {
      occupied: "bg-destructive/10 text-destructive border-destructive/20",
      available: "bg-success/10 text-success border-success/20",
      cleaning: "bg-warning/10 text-warning border-warning/20",
      maintenance: "bg-muted text-muted-foreground border-muted",
      "out_of_order": "bg-muted text-muted-foreground border-muted",
    } as Record<string,string>;

    const labels: Record<string,string> = {
      occupied: "Occupée",
      available: "Disponible",
      cleaning: "Nettoyage",
      maintenance: "Maintenance",
      out_of_order: "Hors service",
    };

    const key = status as string;
    return (
      <Badge variant="outline" className={styles[key] || styles.available}>
        {labels[key] || labels.available}
      </Badge>
    );
  };

  const reserveMut = useMutation({
    mutationFn: async (p: { roomId: number; guestName?: string; checkinNow?: boolean }) => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24*3600*1000);
      const created = await api.post(`/hotel/reservations`, {
        roomId: p.roomId,
        guest: { fullName: p.guestName || "Client" },
        checkIn: now.toISOString(),
        checkOut: tomorrow.toISOString(),
        status: "booked",
        rate: 0,
      });
      const id = (created as any).reservation?.id ?? (created as any).id ?? (created as any).reservationId ?? created;
      if (p.checkinNow) {
        await api.post(`/hotel/reservations/${id}/checkin`);
      }
      return id;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel","rooms"] }); toast({ title: 'Réservation créée' }); },
    onError: (e:any) => toast({ title: 'Erreur réservation', description: String(e), variant: 'destructive' }),
  });

  const quickStats = {
    occupied: rooms.filter((r:any)=>r.status === 'occupied').length,
    arrivals: rooms.filter((r:any)=>r.status === 'available').length,
    departures: rooms.filter((r:any)=>r.status === 'occupied').length,
    maintenance: rooms.filter((r:any)=>r.status === 'maintenance' || r.status === 'out_of_order').length,
  };

  const [guestName, setGuestName] = useState('');
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [newRes, setNewRes] = useState({
    guestName: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    rate: 0,
    checkinNow: false,
  });

  const handleCreateReservation = async () => {
    try {
      if (!selectedRoom?.id) {
        toast({ title: 'Erreur', description: 'Aucune chambre sélectionnée', variant: 'destructive' });
        return;
      }
      if (!newRes.guestName || !newRes.checkIn || !newRes.checkOut || !newRes.rate) {
        toast({ title: 'Champs manquants', description: 'Nom, arrivée, départ et tarif sont requis', variant: 'destructive' });
        return;
      }
      const payload = {
        roomId: Number(selectedRoom.id),
        guest: { fullName: newRes.guestName, email: newRes.email || undefined, phone: newRes.phone || undefined },
        checkIn: new Date(newRes.checkIn).toISOString(),
        checkOut: new Date(newRes.checkOut).toISOString(),
        status: 'booked' as const,
        rate: Math.max(0, Math.floor(Number(newRes.rate)))
      };
      const created: any = await api.post('/hotel/reservations', payload);
      const id = created?.reservation?.id ?? created?.id ?? created;
      if (newRes.checkinNow && id) {
        await api.post(`/hotel/reservations/${id}/checkin`);
      }
      setShowNewReservation(false);
      setSelectedRoom(null);
      setNewRes({ guestName: "", email: "", phone: "", checkIn: "", checkOut: "", rate: 0, checkinNow: false });
      qc.invalidateQueries({ queryKey: ["hotel","rooms"] });
      qc.invalidateQueries({ queryKey: ["hotel","reservations"] });
      toast({ title: 'Réservation créée' });
    } catch (e:any) {
      toast({ title: 'Erreur', description: String(e), variant: 'destructive' });
    }
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
              Gestion Hôtel
            </h1>
            <p className="text-muted-foreground">
              Arrivées • Départs • États des lieux • Inventaire
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Chambres Occupées"
              value={`${quickStats.occupied}`}
              icon={Bed}
              variant="default"
            />
            <StatCard
              title="Arrivées"
              value={`${quickStats.arrivals}`}
              icon={UserPlus}
              variant="success"
            />
            <StatCard
              title="Départs"
              value={`${quickStats.departures}`}
              icon={UserMinus}
              variant="warning"
            />
            <StatCard
              title="Maintenance"
              value={`${quickStats.maintenance}`}
              icon={AlertCircle}
              variant="warning"
            />
          </div>

          {/* Actions & Room Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/hotel/plan')}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Nouvelle Arrivée
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/hotel/plan')}>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Nouveau Départ
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/room-inspection')}>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Etat des Lieux
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/inventory')}>
                  <Package className="mr-2 h-4 w-4" />
                  Gestion Stock
                </Button>
              </CardContent>
            </Card>

            {/* Room Status */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>État des Chambres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map((room) => (
                    <div 
                      key={room.number}
                      className="p-4 border border-border rounded-lg hover:shadow-elegant transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Bed className="h-4 w-4 text-primary" />
                          <span className="font-semibold">Chambre {room.number}</span>
                        </div>
                        {getStatusBadge(room.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>Type: {room.type}</div>
                        {room.guest && <div>Client: {room.guest}</div>}
                        {room.checkout && <div>Départ: {room.checkout}</div>}
                      </div>
                      {room.status === "available" && (
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          variant="outline"
                          onClick={() => {
                            setSelectedRoom(room);
                            const today = new Date();
                            const tomorrow = new Date(Date.now() + 24*3600*1000);
                            const toYmd = (d: Date) => new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
                            setNewRes((r) => ({
                              ...r,
                              guestName: '',
                              email: '',
                              phone: '',
                              checkIn: toYmd(today),
                              checkOut: toYmd(tomorrow),
                              rate: 0,
                              checkinNow: false,
                            }));
                            setShowNewReservation(true);
                          }}
                        >
                          Réserver
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <Dialog open={showNewReservation} onOpenChange={setShowNewReservation}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Nouvelle Réservation — {selectedRoom ? `Chambre ${selectedRoom.number} • ${selectedRoom.type}` : 'Sélectionner une chambre'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="guestName">Nom du client</Label>
                  <Input id="guestName" value={newRes.guestName} onChange={(e)=>setNewRes({...newRes, guestName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkIn">Arrivée</Label>
                    <Input id="checkIn" type="date" value={newRes.checkIn} onChange={(e)=>setNewRes({...newRes, checkIn: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOut">Départ</Label>
                    <Input id="checkOut" type="date" value={newRes.checkOut} onChange={(e)=>setNewRes({...newRes, checkOut: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate">Tarif (MGA)</Label>
                    <Input id="rate" type="number" value={newRes.rate} onChange={(e)=>setNewRes({...newRes, rate: Number(e.target.value) || 0})} />
                  </div>
                  <div className="flex items-end space-x-2">
                    <Checkbox id="checkinNow" checked={newRes.checkinNow} onCheckedChange={(v)=>setNewRes({...newRes, checkinNow: Boolean(v)})} />
                    <Label htmlFor="checkinNow">Check-in immédiat</Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={newRes.email} onChange={(e)=>setNewRes({...newRes, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" value={newRes.phone} onChange={(e)=>setNewRes({...newRes, phone: e.target.value})} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={()=>setShowNewReservation(false)}>Annuler</Button>
                  <Button onClick={handleCreateReservation}>Créer</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default Index;
