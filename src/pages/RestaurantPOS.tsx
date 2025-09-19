import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/rbac";
import { ClipboardList, Utensils, Edit2, Trash2, PlusSquare } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function RestaurantPOS() {
  const { hasScope } = useAuth();
  const qc = useQueryClient();
  const [table, setTable] = useState<string | null>(null);

  const { data: tables = [] } = useQuery({ queryKey: ["restaurant","tables"], queryFn: () => api.get<any[]>("/restaurant/tables") });

  // default to first table code when tables loaded
  React.useEffect(()=>{ if (tables.length && !table) setTable(tables[0].code); }, [tables]);

  const { data: menu = [] } = useQuery({
    queryKey: ["menu","restaurant"],
    queryFn: () => api.get<any[]>(`/inventory/items?isMenu=true&dept=restaurant`),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders","restaurant"],
    queryFn: () => api.get<any[]>(`/restaurant/orders?dept=restaurant&status=open`),
  });

  const openOrder = orders.find((o:any) => o.table?.code === table);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const { data: todaysReservations = [] } = useQuery({ queryKey: ['hotel','reservations', today], queryFn: () => api.get<any[]>(`/hotel/reservations?date=${today}`) });
  const checkedIn = (todaysReservations || []).filter((r:any)=> r.status === 'checked_in' && r.folio);

  const { data: tableOrders = [] } = useQuery({ queryKey: ['restaurant','tableOrders', table], queryFn: () => api.get<any[]>(`/restaurant/orders?dept=restaurant`), enabled: !!table });

  const statusBadge = (s:string) => {
    const styles: Record<string,string> = {
      open: "bg-warning/10 text-warning border-warning/20",
      closed: "bg-success/10 text-success border-success/20",
      cancelled: "bg-muted text-muted-foreground border-muted",
    };
    const labels: Record<string,string> = { open: 'Active', closed: 'Fermée', cancelled: 'Annulée' };
    return <Badge variant="outline" className={styles[s] || styles.open}>{labels[s] || labels.open}</Badge>;
  };

  const [newTableCode, setNewTableCode] = useState("");
  const [editingTable, setEditingTable] = useState<any>(null);

  const createTable = useMutation({ mutationFn: (code:string) => api.post('/restaurant/tables', { code, department: 'restaurant' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['restaurant','tables'] }); setNewTableCode(''); toast({ title: 'Table créée' }); } });
  const editTable = useMutation({ mutationFn: (p:{id:number; code:string}) => api.patch(`/restaurant/tables/${p.id}`, { code: p.code }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['restaurant','tables'] }); setEditingTable(null); toast({ title: 'Table modifiée' }); } });
  const removeTable = useMutation({ mutationFn: (id:number) => api.del(`/restaurant/tables/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['restaurant','tables'] }); toast({ title: 'Table supprimée' }); }, onError: (e:any)=> toast({ title: 'Erreur suppression', description: String(e), variant: 'destructive' }) });

  const createOrder = useMutation({
    mutationFn: (tableCode: string) => api.post(`/restaurant/orders`, { dept: "restaurant", tableCode }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders","restaurant"] }); toast({ title: 'Commande créée', description: 'Nouvelle commande ouverte.' }); },
    onError: (err:any) => toast({ title: 'Erreur création', description: String(err), variant: 'destructive' }),
  });

  const addLine = useMutation({
    mutationFn: (p: { orderId: number; itemId: number }) => api.post(`/restaurant/orders/${p.orderId}/lines`, { itemId: p.itemId, qty: 1 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders","restaurant"] }); toast({ title: 'Ligne ajoutée', description: 'Article envoyé en cuisine.' }); },
    onError: (err:any) => toast({ title: 'Erreur ajout ligne', description: String(err), variant: 'destructive' }),
  });

  const deleteLine = useMutation({
    mutationFn: (p:{orderId:number; lineId:number}) => api.del(`/restaurant/orders/${p.orderId}/lines/${p.lineId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders","restaurant"] }); toast({ title: 'Ligne supprimée' }); },
  });

  const closeOrder = useMutation({
    mutationFn: (orderId:number) => api.post(`/restaurant/orders/${orderId}/close`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders","restaurant"] }); toast({ title: 'Commande clôturée' }); },
    onError: (err:any) => toast({ title: 'Erreur clôture', description: String(err), variant: 'destructive' }),
  });

  const chargeToFolio = useMutation({
    mutationFn: (p:{orderId:number; folioId:number; close?:boolean}) => api.post(`/restaurant/orders/${p.orderId}/charge-to-folio`, { folioId: p.folioId, closeOrder: !!p.close }),
    onSuccess: () => { toast({ title: 'Imputé au folio' }); qc.invalidateQueries({ queryKey: ['orders','restaurant'] }); setChargeOpen(false); setDetailsOpen(false); },
    onError: (e:any) => toast({ title: 'Erreur imputation', description: String(e), variant: 'destructive' }),
  });

  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'cash'|'card'|'mobile'|'bank'>('cash');
  const payOrder = useMutation({
    mutationFn: (p:{orderId:number; amount:number; method:'cash'|'card'|'mobile'|'bank'}) => api.post('/cash/payments', { department: 'restaurant', method: p.method, amount: p.amount, orderId: p.orderId }),
    onSuccess: () => { toast({ title: 'Paiement enregistré' }); setPayAmount(0); qc.invalidateQueries({ queryKey: ['orders','restaurant'] }); },
    onError: (e:any) => toast({ title: 'Erreur paiement', description: String(e), variant: 'destructive' }),
  });

  const addItem = async (item: {id:number; name:string; price:number}) => {
    if (!hasScope('orders:write')) return;
    let id = openOrder?.id as number | undefined;
    if (!id) {
      const o = await createOrder.mutateAsync(table as string);
      id = (o as any).id;
    }
    if (id) await addLine.mutateAsync({ orderId: id, itemId: item.id });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Prise de commande</h1>
            <p className="text-muted-foreground">Tables → Items → Envoi cuisine</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2 rounded border" placeholder="Code table (ex: R1)" value={newTableCode} onChange={(e)=>setNewTableCode(e.target.value)} />
                  <Button onClick={()=> newTableCode.trim() && createTable.mutate(newTableCode.trim()) }><PlusSquare className="w-4 h-4 mr-2"/>Créer</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tables.map((t:any) => {
                    const code = t.code || t.name || String(t.id);
                    const active = table === code;
                    return (
                      <div key={code} className="flex items-center gap-2">
                        <Button variant={active? 'default':'outline'} onClick={()=>setTable(code)}>{code}</Button>
                        <Button size="icon" variant="ghost" onClick={()=> setEditingTable(t) }><Edit2 className="w-4 h-4"/></Button>
                        <Button size="icon" variant="ghost" onClick={()=> { if(confirm('Supprimer cette table ?')) removeTable.mutate(t.id); }}><Trash2 className="w-4 h-4 text-red-600"/></Button>
                      </div>
                    );
                  })}
                </div>
                {editingTable && (
                  <div className="mt-2 flex gap-2">
                    <input className="flex-1 px-3 py-2 rounded border" value={editingTable.code} onChange={(e)=> setEditingTable({...editingTable, code: e.target.value})} />
                    <Button onClick={()=> editTable.mutate({ id: editingTable.id, code: editingTable.code })}>Enregistrer</Button>
                    <Button variant="outline" onClick={()=> setEditingTable(null)}>Annuler</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Menu</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {menu.length === 0 && (<div className="col-span-2 text-sm text-muted-foreground">Aucun plat. Ajoutez des éléments dans Restaurant → Menu.</div>)}
                {menu.map((m:any) => (
                  <Button key={m.id} variant="outline" className="h-auto p-3 flex flex-col" onClick={()=>addItem({ id: m.id, name: m.name, price: m.salePriceDefault })}>
                    <Utensils className="h-5 w-5 mb-1"/>
                    <span className="font-medium text-sm">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{new Intl.NumberFormat('fr-FR').format(m.salePriceDefault)} Ar</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5"/> Commande</CardTitle>
              </CardHeader>
              <CardContent>
                {!table && <div className="text-sm text-muted-foreground">Sélectionnez une table</div>}
                {table && (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">Commandes pour {table}</div>
                    { (tableOrders || []).filter((o:any)=> o.table?.code === table).map((o:any)=> (
                      <div key={o.id} className="p-2 border rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">Commande #{o.id}</div>
                          {statusBadge(o.status)}
                        </div>
                        <div className="text-xs text-muted-foreground">{o.lines?.map((l:any)=> `${l.itemName}×${l.qty}`).join(', ')}</div>
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-sm font-semibold">Total: {new Intl.NumberFormat('fr-FR').format(o.lines?.reduce((s:any,l:any)=> s + (l.unitPrice||0)*l.qty,0)||0)} Ar</div>
                          <div className="flex gap-2">
                            {o.status === 'open' && <Button size="sm" onClick={()=> closeOrder.mutate(o.id)}>Clôturer</Button>}
                            <Button size="sm" variant="outline" onClick={()=> { setSelectedOrder(o); setDetailsOpen(true); }}>Détails</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    { (tableOrders || []).filter((o:any)=> o.table?.code === table).length === 0 && <div className="text-sm text-muted-foreground">Aucune commande pour cette table</div> }
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Détails de la commande {selectedOrder ? `#${selectedOrder.id}` : ''}</DialogTitle>
            <DialogDescription>
              Table {selectedOrder?.table?.code || '—'} • Statut: {selectedOrder?.status || '—'}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="border rounded-md overflow-hidden">
                <div className="grid grid-cols-4 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <div className="col-span-2">Article</div>
                  <div className="text-right">Qté</div>
                  <div className="text-right">Sous-total</div>
                </div>
                <div className="divide-y">
                  {selectedOrder.lines?.map((l:any) => (
                    <div key={l.id} className="grid grid-cols-4 px-3 py-2 text-sm">
                      <div className="col-span-2 truncate">{l.itemName}</div>
                      <div className="text-right">{l.qty}</div>
                      <div className="text-right">{new Intl.NumberFormat('fr-FR').format((l.unitPrice||0)*l.qty)} Ar</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-lg font-semibold">
                  {new Intl.NumberFormat('fr-FR').format(selectedOrder.lines?.reduce((s:any,l:any)=> s + (l.unitPrice||0)*l.qty,0)||0)} Ar
                </div>
              </div>

              {/* Split payments */}
              {selectedOrder.status === 'open' && (
                <div className="grid grid-cols-3 gap-2">
                  <Input min={0} type="number" placeholder="Montant" value={payAmount || ''} onChange={(e)=> setPayAmount(Number(e.target.value))} />
                  <Select value={payMethod} onValueChange={(v)=> setPayMethod(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Méthode"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Espèces</SelectItem>
                      <SelectItem value="card">Carte</SelectItem>
                      <SelectItem value="mobile">Mobile Money</SelectItem>
                      <SelectItem value="bank">Virement</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={()=> payAmount>0 && payOrder.mutate({ orderId: selectedOrder.id, amount: payAmount, method: payMethod })}>Encaisser</Button>
                </div>
              )}

              {/* Charge to room folio */}
              {selectedOrder.status === 'open' && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={()=> setChargeOpen(true)}>Imputer au folio chambre</Button>
                </div>
              )}

              <div className="flex justify-end gap-2">
                {selectedOrder.status === 'open' && (
                  <Button onClick={()=> { closeOrder.mutate(selectedOrder.id); }}>
                    Clôturer la commande
                  </Button>
                )}
                <Button variant="outline" onClick={()=> setDetailsOpen(false)}>Fermer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Charge to Folio Dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Imputer la commande au folio</DialogTitle>
            <DialogDescription>Sélectionnez la réservation (client en chambre)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select onValueChange={(v)=> setSelectedOrder(sel => sel ? { ...sel, targetFolioId: Number(v) } : sel)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une réservation"/></SelectTrigger>
              <SelectContent>
                {checkedIn.map((r:any)=> (
                  <SelectItem key={r.id} value={String(r.folio.id)}>{r.guest.fullName} • Ch {r.room.number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=> setChargeOpen(false)}>Annuler</Button>
              <Button onClick={()=> { if (selectedOrder && (selectedOrder as any).targetFolioId) chargeToFolio.mutate({ orderId: selectedOrder.id, folioId: (selectedOrder as any).targetFolioId, close: true }); }}>Imputer & Clôturer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
