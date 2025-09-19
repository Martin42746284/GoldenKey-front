import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Utensils, Edit2, Trash2, PlusSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function BarPOS() {
  const qc = useQueryClient();
  const { data: tables = [] } = useQuery({ queryKey: ["restaurant","tables"], queryFn: () => api.get<any[]>("/restaurant/tables") });
  const { data: menu = [] } = useQuery({ queryKey: ["menu","pub"], queryFn: () => api.get<any[]>("/inventory/items?isMenu=true&dept=pub") });
  const { data: orders = [] } = useQuery({ queryKey: ["orders","pub"], queryFn: () => api.get<any[]>("/restaurant/orders?dept=pub&status=open") });
  const { data: tabs = [] } = useQuery({ queryKey: ["bar","tabs"], queryFn: () => api.get<any[]>("/bar/tabs") });

  const [tableCode, setTableCode] = useState<string | null>(null);
  const [newTableCode, setNewTableCode] = useState("");
  const [editingTable, setEditingTable] = useState<any>(null);

  useEffect(()=>{
    if (tables.length && !tableCode) {
      const firstPub = tables.find((t:any)=> t.department === 'pub') || tables[0];
      setTableCode(firstPub?.code || null);
    }
  }, [tables]);

  const createTable = useMutation({ mutationFn: (code:string) => api.post('/restaurant/tables', { code, department: 'pub' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['restaurant','tables'] }); setNewTableCode(''); toast({ title: 'Table créée' }); } });
  const editTable = useMutation({ mutationFn: (p:{id:number; code:string}) => api.patch(`/restaurant/tables/${p.id}`, { code: p.code }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['restaurant','tables'] }); setEditingTable(null); toast({ title: 'Table modifiée' }); } });
  const removeTable = useMutation({ mutationFn: (id:number) => api.del(`/restaurant/tables/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['restaurant','tables'] }); toast({ title: 'Table supprimée' }); }, onError: (e:any)=> toast({ title: 'Erreur suppression', description: String(e), variant: 'destructive' }) });

  const createTab = useMutation({ mutationFn: (name?:string) => api.post('/bar/tabs', { customerName: name || '' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['bar','tabs'] }); } });

  const payMut = useMutation({
    mutationFn: (p: { id:number; amount:number; method?: 'cash'|'card'|'mobile'|'bank' }) => api.post(`/bar/tabs/${p.id}/pay`, { amount: p.amount, method: p.method || 'cash' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bar","tabs"] }); toast({ title: 'Encaissement', description: 'Paiement enregistré.' }); },
    onError: (err:any) => toast({ title: 'Erreur encaissement', description: String(err), variant: 'destructive' }),
  });
  const unpaidMut = useMutation({
    mutationFn: (id:number) => api.post(`/bar/tabs/${id}/mark-unpaid`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bar","tabs"] }); toast({ title: 'Marqué impayé', description: 'Le ticket a été marqué impayé.' }); },
    onError: (err:any) => toast({ title: 'Erreur', description: String(err), variant: 'destructive' }),
  });

  const createOrder = useMutation({ mutationFn: (p:{tableCode:string; tabId?:number}) => api.post(`/restaurant/orders`, { dept: 'pub', tableCode: p.tableCode, tabId: p.tabId }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders','pub'] }); toast({ title: 'Commande créée' }); }, onError:(e:any)=> toast({ title:'Erreur création', description:String(e), variant:'destructive' }) });

  const addLine = useMutation({ mutationFn: (p:{orderId:number; itemId:number}) => api.post(`/restaurant/orders/${p.orderId}/lines`, { itemId: p.itemId, qty: 1 }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders','pub'] }); toast({ title: 'Ligne ajoutée' }); } });
  const deleteLine = useMutation({ mutationFn: (p:{orderId:number; lineId:number}) => api.del(`/restaurant/orders/${p.orderId}/lines/${p.lineId}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders','pub'] }); toast({ title: 'Ligne supprimée' }); } });
  const updateLine = useMutation({ mutationFn: (p:{orderId:number; lineId:number; body:any}) => api.patch(`/restaurant/orders/${p.orderId}/lines/${p.lineId}`, p.body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders','pub'] }); toast({ title: 'Ligne mise à jour' }); } });
  const closeOrder = useMutation({ mutationFn: (orderId:number) => api.post(`/restaurant/orders/${orderId}/close`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders','pub'] }); toast({ title: 'Commande clôturée' }); } });
  const payOrder = useMutation({ mutationFn: (p:{orderId:number; amount:number; method:'cash'|'card'|'mobile'|'bank'}) => api.post('/cash/payments', { department: 'pub', method: p.method, amount: p.amount, orderId: p.orderId }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders','pub'] }); toast({ title: 'Paiement enregistré' }); setPayAmount(0); } });
  const chargeToFolio = useMutation({ mutationFn: (p:{orderId:number; folioId:number; close?:boolean}) => api.post(`/restaurant/orders/${p.orderId}/charge-to-folio`, { folioId: p.folioId, closeOrder: !!p.close }), onSuccess: () => { toast({ title: 'Imputé au folio' }); qc.invalidateQueries({ queryKey: ['orders','pub'] }); setChargeOpen(false); setDetailsOpen(false); } });

  const pubTables = tables.filter((t:any)=> t.department === 'pub');
  const openOrderForTable = (code?: string) => orders.find((o:any)=> (o.table?.code || o.tableId || '') === code || (o.table && o.table.code === code));
  const currentOrder = openOrderForTable(tableCode || undefined);

  const [editingLine, setEditingLine] = useState<any>(null);
  const [editQty, setEditQty] = useState<number>(1);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'cash'|'card'|'mobile'|'bank'>('cash');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const { data: todaysReservations = [] } = useQuery({ queryKey: ['hotel','reservations', today], queryFn: () => api.get<any[]>(`/hotel/reservations?date=${today}`) });
  const checkedIn = (todaysReservations || []).filter((r:any)=> r.status === 'checked_in' && r.folio);

  const openEditLine = (order:any, line:any) => { setEditingLine({ orderId: order.id, line }); setEditQty(line.qty || 1); };
  const saveEditLine = async () => {
    if (!editingLine) return;
    await updateLine.mutateAsync({ orderId: editingLine.orderId, lineId: editingLine.line.id, body: { qty: editQty } });
    setEditingLine(null);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Bar POS</h1>
            <p className="text-muted-foreground">Création de commandes • Gestion tables Pub</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader><CardTitle>Tables Pub</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Code table" value={newTableCode} onChange={(e)=>setNewTableCode(e.target.value)} />
                  <Button onClick={()=> newTableCode.trim() && createTable.mutate(newTableCode.trim()) }><PlusSquare className="w-4 h-4 mr-2"/>Créer</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pubTables.map((t:any)=> (
                    <div key={t.id} className="flex items-center gap-2">
                      <Button variant={tableCode===t.code? 'default':'outline'} onClick={()=>setTableCode(t.code)}>{t.code}</Button>
                      <Button size="icon" variant="ghost" onClick={()=> setEditingTable(t) }><Edit2 className="w-4 h-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={()=> { if(confirm('Supprimer cette table ?')) removeTable.mutate(t.id); }}><Trash2 className="w-4 h-4 text-red-600"/></Button>
                    </div>
                  ))}
                </div>

                {editingTable && (
                  <div className="mt-2 flex gap-2">
                    <Input value={editingTable.code} onChange={(e)=> setEditingTable({...editingTable, code: e.target.value})} />
                    <Button onClick={()=> editTable.mutate({ id: editingTable.id, code: editingTable.code })}>Enregistrer</Button>
                    <Button variant="outline" onClick={()=> setEditingTable(null)}>Annuler</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Menu Pub</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {menu.length===0 && <div className="col-span-2 text-sm text-muted-foreground">Aucun plat</div>}
                {menu.map((m:any)=> (
                  <Button key={m.id} variant="outline" className="h-auto p-3 flex flex-col" onClick={async ()=>{
                    if (!tableCode) return toast({ title: 'Sélectionnez une table' });
                    let id = currentOrder?.id;
                    if (!id) {
                      // create a tab automatically for the pub order
                      const t = await createTab.mutateAsync(tableCode);
                      const tabId = (t as any)?.id ?? (t as any);
                      const o = await createOrder.mutateAsync({ tableCode, tabId });
                      id = (o as any).id;
                    }
                    if (id) addLine.mutate({ orderId: id, itemId: m.id });
                  }}>
                    <Utensils className="h-5 w-5 mb-1" />
                    <span className="font-medium text-sm">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{new Intl.NumberFormat('fr-FR').format(m.salePriceDefault)} Ar</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5"/> Commande</CardTitle></CardHeader>
              <CardContent>
                {!tableCode && <div className="text-sm text-muted-foreground">Sélectionnez une table</div>}
                {tableCode && (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">Commandes pour {tableCode}</div>
                    {orders.filter((o:any)=> (o.table?.code || o.tableId) === tableCode).map((o:any)=> (
                      <div key={o.id} className="p-2 border rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">Commande #{o.id}</div>
                          <Badge variant="outline">{o.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{o.lines?.map((l:any)=> (
                          <span key={l.id} className="cursor-pointer underline" onClick={()=> openEditLine(o, l)}>{`${l.itemName}×${l.qty}`}</span>
                        )).reduce((prev:any,curr:any)=> prev===null? [curr]: [...prev, ', ', curr], null)}</div>
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-sm font-semibold">Total: {new Intl.NumberFormat('fr-FR').format(o.lines?.reduce((s:any,l:any)=> s + (l.unitPrice||0)*l.qty,0)||0)} Ar</div>
                          <div className="flex gap-2">
                            {o.status === 'open' && <Button size="sm" onClick={()=> closeOrder.mutate(o.id)}>Clôturer</Button>}
                            <Button size="sm" variant="outline" onClick={()=> { setSelectedOrder(o); setDetailsOpen(true); }}>Détails</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {orders.filter((o:any)=> (o.table?.code || o.tableId) === tableCode).length === 0 && <div className="text-sm text-muted-foreground">Aucune commande pour cette table</div>}

                    {(() => {
                      const tab = tabs.find((t:any) => (t.customerName || t.customer_name) === tableCode && t.status !== 'paid');
                      if (!tab) return null;
                      return (
                        <div className="mt-3 p-2 border rounded-md">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">Ticket #{tab.id} • {tab.customerName || tab.customer_name}</div>
                            <Badge variant="outline">{tab.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Solde actuel: {new Intl.NumberFormat('fr-FR').format(tab.balance || 0)} Ar</div>
                          <div className="flex items-center gap-2 mt-2">
                            <Input type="number" placeholder="Montant" value={payAmount || ''} onChange={(e)=> setPayAmount(Number(e.target.value))} />
                            <Button size="sm" disabled={!payAmount || payAmount<=0} onClick={async ()=> { await payMut.mutateAsync({ id: tab.id, amount: payAmount }); setPayAmount(0); qc.invalidateQueries({ queryKey: ["orders","pub"] }); }}>Encaisser</Button>
                            {tab.status !== 'paid' && <Button size="sm" variant="outline" onClick={()=> unpaidMut.mutate(tab.id)}>Marquer impayé</Button>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

        </main>

        {/* Order Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Détails de la commande {selectedOrder ? `#${selectedOrder.id}` : ''}</DialogTitle>
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
                    <Input type="number" placeholder="Montant" value={payAmount || ''} onChange={(e)=> setPayAmount(Number(e.target.value))} />
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

        <Dialog open={!!editingLine} onOpenChange={(open)=>{ if(!open) setEditingLine(null); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>Modifier ligne</DialogTitle></DialogHeader>
            {editingLine && (
              <div className="space-y-3">
                <div className="text-sm">{editingLine.line?.itemName}</div>
                <Input type="number" value={editQty} onChange={(e)=>setEditQty(Number(e.target.value))} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={()=> setEditingLine(null)}>Annuler</Button>
                  <Button onClick={saveEditLine}>Enregistrer</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
