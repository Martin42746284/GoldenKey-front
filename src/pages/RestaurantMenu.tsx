import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { UtensilsCrossed, PlusCircle, Trash2, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function RestaurantMenu() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [vat, setVat] = useState<number>(20);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState<number>(0);

  const { data: menu = [] } = useQuery({
    queryKey: ["menu","restaurant"],
    queryFn: () => api.get<any[]>(`/inventory/items?isMenu=true&dept=restaurant`),
  });

  const addMut = useMutation({
    mutationFn: (body: any) => api.post(`/inventory/items`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu","restaurant"] }); toast({ title: 'Plat ajouté', description: 'Le plat a été ajouté au menu.' }); },
    onError: (err:any) => toast({ title: 'Erreur ajout', description: String(err), variant: 'destructive' }),
  });
  const editMut = useMutation({
    mutationFn: (p: { id:number; body:any }) => api.patch(`/inventory/items/${p.id}`, p.body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu","restaurant"] }); toast({ title: 'Plat modifié', description: 'Le plat a été mis à jour.' }); },
    onError: (err:any) => toast({ title: 'Erreur modification', description: String(err), variant: 'destructive' }),
  });
  const delMut = useMutation({
    mutationFn: (id:number) => api.del(`/inventory/items/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu","restaurant"] }); toast({ title: 'Plat supprimé', description: 'Le plat a été supprimé.' }); },
    onError: (err:any) => toast({ title: 'Erreur suppression', description: String(err), variant: 'destructive' }),
  });

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || price <= 0) return;
    const sku = `MENU-${Date.now()}`;
    addMut.mutate({ sku, name: trimmed, unit: "piece", vatRate: vat, costPrice: 0, salePriceDefault: price, isActive: true, isMenu: true, menuDept: "restaurant" });
    setName("");
    setPrice(0);
  };

  const startEdit = (id: number, n: string, p: number) => {
    setEditingId(id);
    setEditName(n);
    setEditPrice(p);
  };

  const applyEdit = () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed || editPrice <= 0) return;
    editMut.mutate({ id: editingId, body: { name: trimmed, salePriceDefault: editPrice } });
    setEditingId(null);
  };

  const deleteItem = (id: number) => delMut.mutate(id);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><UtensilsCrossed className="h-7 w-7"/> Menu Restaurant</h1>
            <p className="text-muted-foreground">Gérer les plats vendus au POS</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ajouter un plat</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={onAdd} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ex: Pizza Margherita"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Prix (Ar)</Label>
                      <Input type="number" minLength={0} value={price} onChange={(e)=>setPrice(Number(e.target.value))} min={0} />
                    </div>
                    <div className="space-y-2">
                      <Label>TVA (%)</Label>
                      <Input type="number" minLength={0} value={vat} onChange={(e)=>setVat(Number(e.target.value))} min={0} max={100} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4"/>Ajouter</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Plats du menu</CardTitle>
              </CardHeader>
              <CardContent>
                {menu.length === 0 && <div className="text-sm text-muted-foreground">Aucun plat pour le moment.</div>}
                <div className="grid md:grid-cols-2 gap-3">
                  {menu.map((m) => (
                    <div key={m.id} className="p-3 border rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{new Intl.NumberFormat('fr-FR').format(m.salePriceDefault)} Ar • TVA {m.vatRate}%</div>
                        <div className="mt-1">
                          {m.isActive ? <Badge variant="outline" className="text-green-600 border-green-600/40">Actif</Badge> : <Badge variant="outline" className="text-muted-foreground">Inactif</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" onClick={()=>startEdit(m.id, m.name, m.salePriceDefault)}><Pencil className="h-4 w-4"/></Button>
                        <Button size="icon" variant="destructive" onClick={()=>deleteItem(m.id)}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                    </div>
                  ))}
                </div>

                {editingId && (
                  <div className="mt-4 p-3 border rounded-md space-y-2">
                    <div className="font-semibold">Modifier</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input value={editName} onChange={(e)=>setEditName(e.target.value)} />
                      <Input type="number" value={editPrice} onChange={(e)=>setEditPrice(Number(e.target.value))} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={()=>setEditingId(null)}>Annuler</Button>
                      <Button onClick={applyEdit}>Enregistrer</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
