import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/rbac";
import { api } from "@/lib/api";
import { Bed, CheckCircle2, Hammer, Sparkles, UserMinus, UserPlus, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

function mapApiToUi(status: string): "occupied"|"clean"|"dirty"|"inspected"|"out-of-order" {
  if (status === "occupied") return "occupied";
  if (status === "cleaning") return "dirty";
  if (status === "out_of_order" || status === "maintenance") return "out-of-order";
  return "clean";
}
function mapUiToApi(status: string): "available"|"occupied"|"cleaning"|"maintenance"|"out_of_order" {
  if (status === "occupied") return "occupied";
  if (status === "dirty") return "cleaning";
  if (status === "out-of-order") return "out_of_order";
  if (status === "inspected" || status === "clean") return "available";
  return "available";
}

export default function HotelPlan() {
  const { hasScope } = useAuth();
  const qc = useQueryClient();
  const { data: rooms = [] } = useQuery({
    queryKey: ["hotel","rooms"],
    queryFn: () => api.get<any[]>("/hotel/rooms"),
  });
  const [guestName, setGuestName] = useState("");

  const grouped = useMemo(() => {
    const floors: Record<string, any[]> = {};
    rooms.forEach((r: any) => {
      const floor = String(r.number).slice(0, 1) + "00";
      floors[floor] = floors[floor] || [];
      floors[floor].push(r);
    });
    return Object.entries(floors).sort(([a], [b]) => Number(a) - Number(b));
  }, [rooms]);

  const statusBadge = (status: string) => {
    const s = mapApiToUi(status);
    const styles: Record<string, string> = {
      occupied: "bg-destructive/10 text-destructive border-destructive/20",
      clean: "bg-success/10 text-success border-success/20",
      dirty: "bg-warning/10 text-warning border-warning/20",
      inspected: "bg-primary/10 text-primary border-primary/20",
      "out-of-order": "bg-muted text-muted-foreground border-muted",
    };
    const labels: Record<string, string> = {
      occupied: "Occupée",
      clean: "Propre",
      dirty: "À nettoyer",
      inspected: "Inspectée",
      "out-of-order": "Hors service",
    };
    return (
      <Badge variant="outline" className={styles[s]}>
        {labels[s]}
      </Badge>
    );
  };

  const setStatus = useMutation({
    mutationFn: (p: { id: number; status: string }) => api.patch(`/hotel/rooms/${p.id}/status`, { status: mapUiToApi(p.status) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotel","rooms"] });
      toast({ title: "Statut mis à jour", description: "Le statut de la chambre a été mis à jour.", duration: 4000 });
    },
    onError: (err: any) => toast({ title: "Erreur", description: String(err), variant: "destructive" }),
  });

  const checkIn = useMutation({
    mutationFn: async (p: { roomId: number; guest: string }) => {
      const now = new Date();
      const tomorrow = new Date(Date.now() + 24*3600*1000);
      const created = await api.post<{ reservation: any }>(`/hotel/reservations`, {
        roomId: p.roomId,
        guest: { fullName: p.guest || "Client" },
        checkIn: now.toISOString(),
        checkOut: tomorrow.toISOString(),
        status: "booked",
        rate: 0,
      });
      const id = (created as any).reservation?.id ?? (created as any).id ?? (created as any).reservationId ?? created;
      return api.post(`/hotel/reservations/${id}/checkin`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotel","rooms"] });
      toast({ title: "Check-in", description: "Client enregistré en chambre.", duration: 4000 });
    },
    onError: (err:any) => toast({ title: "Erreur check-in", description: String(err), variant: "destructive" }),
  });

  const checkOut = useMutation({
    mutationFn: async (roomId: number) => {
      const ymd = new Date().toISOString().slice(0,10);
      const reservations = await api.get<any[]>(`/hotel/reservations?date=${ymd}`);
      const current = reservations.find((r: any) => r.roomId === roomId && r.status === "checked_in");
      if (!current) throw new Error("Aucune réservation en cours pour cette chambre");
      return api.post(`/hotel/reservations/${current.id}/checkout`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotel","rooms"] });
      toast({ title: "Check-out", description: "Client sorti, chambre marquée pour nettoyage.", duration: 4000 });
    },
    onError: (err:any) => toast({ title: "Erreur check-out", description: String(err), variant: "destructive" }),
  });

  const canWrite = hasScope("rooms:write");

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Plan des Chambres</h1>
            <p className="text-muted-foreground">Statuts • Check-in/Check-out • Inspection</p>
          </div>

          {grouped.map(([floor, rs]) => (
            <Card key={floor}>
              <CardHeader>
                <CardTitle>Étage {floor}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {rs
                    .slice()
                    .sort((a: any, b: any) => Number(a.number) - Number(b.number))
                    .map((room: any) => (
                      <div key={room.id} className="p-4 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Bed className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{room.number} • {room.type}</span>
                          </div>
                          {statusBadge(room.status)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {mapApiToUi(room.status) === 'occupied' ? <div>Client en chambre</div> : <div>Libre</div>}
                        </div>
                        <div className="my-3">
                          <img src={`/rooms/${mapApiToUi(room.status)}.svg`} alt={room.status} className="w-full h-24 object-cover rounded" />
                        </div>
                        <Separator className="my-3" />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" disabled={!canWrite || mapApiToUi(room.status) === "occupied"} onClick={() => checkIn.mutate({ roomId: room.id, guest: guestName })}>
                            <UserPlus className="h-4 w-4 mr-2" /> Check-in
                          </Button>
                          <Button size="sm" variant="outline" disabled={!canWrite || mapApiToUi(room.status) !== "occupied"} onClick={() => checkOut.mutate(room.id)}>
                            <UserMinus className="h-4 w-4 mr-2" /> Check-out
                          </Button>
                          <Button size="sm" variant="outline" disabled={!canWrite} onClick={() => setStatus.mutate({ id: room.id, status: "dirty" })}>
                            <Hammer className="h-4 w-4 mr-2" /> Sale
                          </Button>
                          <Button size="sm" variant="outline" disabled={!canWrite} onClick={() => setStatus.mutate({ id: room.id, status: "clean" })}>
                            <Sparkles className="h-4 w-4 mr-2" /> Propre
                          </Button>
                          <Button size="sm" variant="outline" disabled={!canWrite} onClick={() => setStatus.mutate({ id: room.id, status: "inspected" })}>
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Inspectée
                          </Button>
                          <Button size="sm" variant="outline" disabled={!canWrite} onClick={() => setStatus.mutate({ id: room.id, status: "out-of-order" })}>
                            <Wrench className="h-4 w-4 mr-2" /> HS
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Check-in Express</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 items-center">
              <input
                className="flex-1 px-3 py-2 rounded-md border bg-background"
                placeholder="Nom du client (optionnel)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">Le nom sera utilisé pour le prochain check-in</span>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
