import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {Sidebar} from "@/components/layout/sidebar";

function mapUiToApi(status: "occupied"|"clean"|"dirty"|"inspected"|"out-of-order"): "available"|"occupied"|"cleaning"|"maintenance"|"out_of_order" {
  if (status === "occupied") return "occupied";
  if (status === "dirty") return "cleaning";
  if (status === "out-of-order") return "out_of_order";
  if (status === "inspected" || status === "clean") return "available";
  return "available";
}

export default function RoomsManage() {
  const qc = useQueryClient();
  const { data: rooms = [] } = useQuery({ queryKey: ["hotel","rooms"], queryFn: () => api.get<any[]>("/hotel/rooms") });
  const [number, setNumber] = useState("");
  const [type, setType] = useState<"Standard"|"Deluxe"|"Suite">("Standard");
  const [status, setStatus] = useState<"occupied"|"clean"|"dirty"|"inspected"|"out-of-order">("clean");

  const [rangeStart, setRangeStart] = useState<number>(101);
  const [rangeEnd, setRangeEnd] = useState<number>(110);
  const [rangeType, setRangeType] = useState<"Standard"|"Deluxe"|"Suite">("Standard");

  const addOneMut = useMutation({
    mutationFn: () => api.post(`/hotel/rooms`, { number, type, status: mapUiToApi(status) }),
    onSuccess: () => { setNumber(""); qc.invalidateQueries({ queryKey: ["hotel","rooms"] }); toast({ title: 'Chambre ajoutée', description: 'La chambre a été créée.' }); },
    onError: (err:any) => toast({ title: 'Erreur création', description: String(err), variant: 'destructive' }),
  });

  const bulkAddMut = useMutation({
    mutationFn: async () => {
      const tasks: Promise<any>[] = [];
      for (let n = rangeStart; n <= rangeEnd; n++) {
        tasks.push(api.post(`/hotel/rooms`, { number: String(n), type: rangeType, status: "available" }));
      }
      await Promise.all(tasks);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel","rooms"] }); toast({ title: 'Plage ajoutée', description: 'Les chambres ont été créées.' }); },
    onError: (err:any) => toast({ title: 'Erreur ajout en masse', description: String(err), variant: 'destructive' }),
  });

  const setRoomStatus = useMutation({
    mutationFn: (p: { id:number; status: typeof status }) => api.patch(`/hotel/rooms/${p.id}/status`, { status: mapUiToApi(p.status) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel","rooms"] }); toast({ title: 'Statut mis à jour', description: 'Le statut a été modifié.' }); },
    onError: (err:any) => toast({ title: 'Erreur statut', description: String(err), variant: 'destructive' }),
  });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Chambres</h1>
            <p className="text-muted-foreground">Création, numérotation, statut</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Ajouter une chambre</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Numéro (ex: 121)" value={number} onChange={(e)=>setNumber(e.target.value)} />
                <Select value={type} onValueChange={(v)=>setType(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Type"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Deluxe">Deluxe</SelectItem>
                    <SelectItem value="Suite">Suite</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v)=>setStatus(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Statut"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clean">Propre</SelectItem>
                    <SelectItem value="dirty">À nettoyer</SelectItem>
                    <SelectItem value="inspected">Inspectée</SelectItem>
                    <SelectItem value="occupied">Occupée</SelectItem>
                    <SelectItem value="out-of-order">Hors service</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => addOneMut.mutate()} disabled={!number}>Ajouter</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Ajout par plage</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Début (ex: 101)" min={0} value={rangeStart || ''} onChange={(e)=>setRangeStart(Number(e.target.value))} />
                  <Input type="number" placeholder="Fin (ex: 120)" min={0} value={rangeEnd || ''} onChange={(e)=>setRangeEnd(Number(e.target.value))} />
                </div>
                <Select value={rangeType} onValueChange={(v)=>setRangeType(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Type"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Deluxe">Deluxe</SelectItem>
                    <SelectItem value="Suite">Suite</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => bulkAddMut.mutate()} disabled={!rangeStart || !rangeEnd || rangeEnd < rangeStart}>Ajouter la plage</Button>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <Card>
            <CardHeader><CardTitle>Liste des chambres</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rooms.slice().sort((a:any,b:any)=>Number(a.number)-Number(b.number)).map((r:any) => (
                  <div key={r.id} className="p-3 border rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Ch {r.number} • {r.type}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const ok = window.confirm(`Supprimer la chambre ${r.number} ? Cette action est irréversible.`);
                          if (!ok) return;
                          try {
                            await api.del(`/hotel/rooms/${r.id}`);
                            qc.invalidateQueries({ queryKey: ["hotel","rooms"] });
                            toast({ title: 'Chambre supprimée', description: `La chambre ${r.number} a été supprimée.` });
                          } catch (err: any) {
                            toast({ title: 'Suppression impossible', description: String(err), variant: 'destructive' });
                          }
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <Select value={r.status} onValueChange={(v)=>setRoomStatus.mutate({ id: r.id, status: v as any })}>
                        <SelectTrigger><SelectValue placeholder="Statut"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Propre</SelectItem>
                          <SelectItem value="cleaning">À nettoyer</SelectItem>
                          <SelectItem value="occupied">Occupée</SelectItem>
                          <SelectItem value="out_of_order">Hors service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
