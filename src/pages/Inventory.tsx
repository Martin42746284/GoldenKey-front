import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Package, TrendingDown, TrendingUp, Plus, Search, AlertTriangle, Edit2, Trash2, Upload } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const itemFormSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  unit: z.enum(["piece", "kg", "g", "L", "cl", "ml"]),
  cost_price: z.number().min(0),
  sale_price_default: z.number().min(0),
  vat_rate: z.number().min(0).max(100),
  is_active: z.boolean().default(true),
});

const stockFormSchema = z.object({
  item_id: z.number().min(1),
  store_id: z.number().min(1),
  qty_on_hand: z.number().min(0),
  min_level: z.number().min(0),
  max_level: z.number().min(1),
});

export default function Inventory() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: stores = [] } = useQuery({ queryKey: ["inventory","stores"], queryFn: () => api.get<any[]>("/inventory/stores") });
  const { data: items = [] } = useQuery({ queryKey: ["inventory","items"], queryFn: () => api.get<any[]>("/inventory/items") });
  const { data: stocks = [] } = useQuery({ queryKey: ["inventory","stocks"], queryFn: () => api.get<any[]>("/inventory/stocks") });
  const { data: stock_movements = [] } = useQuery({ queryKey: ["inventory","movements"], queryFn: () => api.get<any[]>("/inventory/movements?limit=200") });

  const [storeId, setStoreId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [qty, setQty] = useState<number>(0);
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [searchTerm, setSearchTerm] = useState("");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);

  const itemForm = useForm<z.infer<typeof itemFormSchema>>({ resolver: zodResolver(itemFormSchema), defaultValues: { name: "", sku: "", unit: "piece", cost_price: 0, sale_price_default: 0, vat_rate: 20, is_active: true } });
  const stockForm = useForm<z.infer<typeof stockFormSchema>>({ resolver: zodResolver(stockFormSchema), defaultValues: { item_id: 0, store_id: 0, qty_on_hand: 0, min_level: 0, max_level: 100 } });

  const stocksByStore = useMemo(() => {
    const s = (stocks || []).filter((st: any) => (st.storeId || st.store?.id || st.store_id) === storeId);
    if (!searchTerm) return s;
    const searchLower = searchTerm.toLowerCase();
    return s.filter((st: any) => {
      const it = st.item || st.Item || {};
      return (it.name || "").toLowerCase().includes(searchLower) || (it.sku || "").toLowerCase().includes(searchLower);
    });
  }, [stocks, storeId, searchTerm]);

  const lowLevel = useMemo(() => stocksByStore.filter((s:any) => (s.qty || s.qty_on_hand || 0) <= (s.minQty || s.min_level || 0)), [stocksByStore]);
  const outOfStock = useMemo(() => stocksByStore.filter((s:any) => (s.qty || s.qty_on_hand || 0) === 0), [stocksByStore]);

  const availableItems = useMemo(() => {
    const presentIds = new Set((stocks || []).map((s:any) => s.itemId || s.item?.id));
    return (items || []).filter((it:any) => !presentIds.has(it.id));
  }, [items, stocks]);

// src/pages/Inventory.tsx

const addItemMut = useMutation({
  mutationFn: (data: any) => api.post('/inventory/items', { 
    sku: data.sku, 
    name: data.name, 
    unit: data.unit, 
    vatRate: data.vat_rate, 
    costPrice: data.cost_price, 
    salePriceDefault: data.sale_price_default, 
    isActive: data.is_active 
  }),
  onSuccess: (createdItem: any) => {
    qc.invalidateQueries({ queryKey: ["inventory","items"] });
    itemForm.reset();
    setShowItemDialog(false);
    toast({ title: 'Article créé', description: "L'article a été ajouté." });
    // => Ouvre la modale Ajout Stock, prépare le formulaire avec l'article créé
    stockForm.reset({ 
      item_id: createdItem.id, 
      store_id: 0, 
      qty_on_hand: 0, 
      min_level: 0, 
      max_level: 100 
    });
    setShowStockDialog(true);
  },
  onError: (err:any) => toast({ title: 'Erreur création article', description: String(err), variant: 'destructive' }),
});

  const addStockMut = useMutation({
    mutationFn: (data:any) => api.post('/inventory/stocks', {
      storeId: data.store_id,
      itemId: data.item_id,
      qty: data.qty_on_hand,
      minQty: data.min_level,
      maxQty: data.max_level // mapping ajouté
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory","stocks"] }); stockForm.reset(); setShowStockDialog(false); toast({ title: 'Stock créé', description: 'Le stock a été ajouté.' }); },
    onError: (err:any) => {
      const msg = err?.message || String(err);
      toast({ title: 'Erreur création stock', description: msg.includes('Store not found') ? 'Le magasin sélectionné est introuvable.' : msg, variant: 'destructive' });
    },
  });

  // keep local storeId in sync with loaded stores
  useEffect(() => {
    if (stores.length && !storeId) {
      setStoreId(stores[0].id);
      stockForm.reset({ ...stockForm.getValues(), store_id: stores[0].id, item_id: availableItems[0]?.id ?? 0 });
    }
  }, [stores]);

  const moveMut = useMutation({
    mutationFn: (m:any) => api.post('/inventory/movements', { storeId: m.storeId, itemId: m.itemId, qty: m.qty, type: m.type, reason: m.reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory","stocks"] }); qc.invalidateQueries({ queryKey: ["inventory","movements"] }); toast({ title: 'Mouvement enregistré' }); setQty(0); },
    onError: (err:any) => toast({ title: 'Erreur mouvement', description: String(err), variant: 'destructive' }),
  });

  const doMove = () => {
    if (!selectedItem || qty === 0 || !storeId) return;
    moveMut.mutate({ storeId, itemId: selectedItem, qty, type, reason: type === 'IN' ? 'Réception' : type === 'OUT' ? 'Sortie' : 'Ajustement' });
  };

  const delStockMut = useMutation({
    mutationFn: (id:number) => api.del(`/inventory/stocks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory","stocks"] }); toast({ title: 'Stock supprimé' }); },
    onError: (err:any) => toast({ title: 'Erreur suppression', description: String(err), variant: 'destructive' }),
  });

  const editStockMut = useMutation({
    mutationFn: (p:{id:number; body:any}) => api.patch(`/inventory/stocks/${p.id}`, {
      qty: p.body.qty_on_hand,
      minQty: p.body.min_level,
      maxQty: p.body.max_level // mapping ajouté
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory","stocks"] }); toast({ title: 'Stock mis à jour' }); setEditingStock(null); setEditStockDialog(false); },
    onError: (err:any) => toast({ title: 'Erreur mise à jour', description: String(err), variant: 'destructive' }),
  });

  const [editingStock, setEditingStock] = useState<any>(null);
  const [editStockDialog, setEditStockDialog] = useState(false);

  const onEditClick = (s:any) => { setEditingStock(s); setEditStockDialog(true); stockForm.reset({ item_id: s.itemId, store_id: s.storeId, qty_on_hand: s.qty, min_level: s.minQty || 0, max_level: s.maxQty || 100 }); };
  const onDeleteClick = (id:number) => { if (confirm('Supprimer ce stock ?')) delStockMut.mutate(id); };
  const onSaveEdit = (data: z.infer<typeof stockFormSchema>) => { if (!editingStock) return; editStockMut.mutate({ id: editingStock.id, body: { qty: data.qty_on_hand, minQty: data.min_level } }); };

  // CSV import
  const [importing, setImporting] = useState(false);
  const handleFile = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const header = lines[0].split(',').map(h=>h.trim().toLowerCase());
    const rows = lines.slice(1).map(l=>l.split(',').map(c=>c.trim()));
    let created = 0; let failed = 0;
    for (const r of rows) {
      const obj:any = {};
      header.forEach((h,i)=> obj[h]=r[i]);
      try {
        const storeIdVal = Number(obj.storeid || obj.store_id);
        const itemIdVal = Number(obj.itemid || obj.item_id);
        const qtyVal = Number(obj.qty || obj.qty_on_hand || obj.quantity || 0);
        const minVal = Number(obj.min || obj.minlevel || obj.min_qty || 0);
        if (!storeIdVal || !itemIdVal) throw new Error('Missing ids');
        await api.post('/inventory/stocks', { storeId: storeIdVal, itemId: itemIdVal, qty: qtyVal, minQty: minVal });
        created++;
      } catch (e) { failed++; }
    }
    qc.invalidateQueries({ queryKey: ["inventory","stocks"] });
    setImporting(false);
    toast({ title: 'Import terminé', description: `${created} créés, ${failed} échoués` });
  };

  const onAddItem = (data: z.infer<typeof itemFormSchema>) => addItemMut.mutate(data);
  const onAddStock = (data: z.infer<typeof stockFormSchema>) => addStockMut.mutate(data);

  // alerts polling
  const [lastAlerts, setLastAlerts] = useState<{out:any[]; low:any[]}>({out:[], low:[]});
  useEffect(()=>{
    let mounted = true;
    const poll = async ()=>{
      try{
        const a = await api.get<any>(`/inventory/alerts${storeId?`?storeId=${storeId}`:''}`);
        if (!mounted) return;
        // find new outs
        const newOuts = a.out.filter((o:any)=> !lastAlerts.out.some((x:any)=> x.id===o.id));
        const newLows = a.low.filter((o:any)=> !lastAlerts.low.some((x:any)=> x.id===o.id));
        if (newOuts.length) toast({ title: 'Ruptures détectées', description: `${newOuts.length} articles en rupture`, variant: 'destructive' });
        if (newLows.length) toast({ title: 'Seuils bas', description: `${newLows.length} articles en alerte` });
        setLastAlerts(a);
      }catch(e){}
    };
    poll();
    const iv = setInterval(poll, 15000);
    return ()=>{ mounted=false; clearInterval(iv); };
  }, [storeId]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Inventaire</h1>
              <p className="text-muted-foreground">Niveaux de stock • Alertes • Mouvements</p>
            </div>
            <div className="flex gap-3">
              <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvel Article
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader><DialogTitle>Ajouter un article</DialogTitle></DialogHeader>
                  <Form {...itemForm}>
                    <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={itemForm.control} name="name" render={({ field }) => (
                          <FormItem className="col-span-2"><FormLabel>Nom de l'article</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                        )} />

                        <FormField control={itemForm.control} name="sku" render={({ field }) => (
                          <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                        )} />

                        <FormField control={itemForm.control} name="unit" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unité</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="piece">Pièce</SelectItem>
                                  <SelectItem value="kg">Kilogramme</SelectItem>
                                  <SelectItem value="g">Gramme</SelectItem>
                                  <SelectItem value="L">Litre</SelectItem>
                                  <SelectItem value="cl">Centilitre</SelectItem>
                                  <SelectItem value="ml">Millilitre</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )} />

                        <FormField control={itemForm.control} name="cost_price" render={({ field }) => (
                          <FormItem><FormLabel>Prix coûtant (Ar)</FormLabel><FormControl><Input type="number" {...field} onChange={(e)=>field.onChange(Number(e.target.value))}/></FormControl><FormMessage/></FormItem>
                        )} />

                        <FormField control={itemForm.control} name="sale_price_default" render={({ field }) => (
                          <FormItem><FormLabel>Prix de vente (Ar)</FormLabel><FormControl><Input type="number" {...field} onChange={(e)=>field.onChange(Number(e.target.value))}/></FormControl><FormMessage/></FormItem>
                        )} />

                        <FormField control={itemForm.control} name="vat_rate" render={({ field }) => (
                          <FormItem className="col-span-2"><FormLabel>TVA (%)</FormLabel><FormControl><Input type="number" {...field} onChange={(e)=>field.onChange(Number(e.target.value))}/></FormControl><FormMessage/></FormItem>
                        )} />

                      </div>
                      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={()=>setShowItemDialog(false)}>Annuler</Button><Button type="submit">Ajouter</Button></div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={stores.length === 0 || items.length === 0}><Package className="w-4 h-4 mr-2"/>Nouveau Stock</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader><DialogTitle>Ajouter un stock</DialogTitle></DialogHeader>
                  <Form {...stockForm}>
                    <form onSubmit={stockForm.handleSubmit(onAddStock)} className="space-y-4">
                      {/* Pour la selection d'un article */}
                      <FormField control={stockForm.control} name="item_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Article</FormLabel>
                          <FormControl>
                            <Select onValueChange={(v)=>field.onChange(Number(v))} value={String(field.value)}>
                              <SelectTrigger><SelectValue placeholder="Sélectionner un article"/></SelectTrigger>
                              <SelectContent>
                                {items.map((item:any)=>(<SelectItem key={item.id} value={String(item.id)}>{item.name} ({item.sku})</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage/>
                        </FormItem>
                      )} />
                      {/* Pour la selection d'un magasin */}
                      <FormField control={stockForm.control} name="store_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Magasin</FormLabel>
                          <FormControl>
                            <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un magasin" />
                              </SelectTrigger>
                              <SelectContent>
                                {stores.map((store: any) => (
                                  <SelectItem key={store.id} value={String(store.id)}>
                                    {store.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField control={stockForm.control} name="qty_on_hand" render={({ field }) => (
                          <FormItem><FormLabel>Qté initiale</FormLabel><FormControl><Input min={0} type="number" {...field} onChange={(e)=>field.onChange(Number(e.target.value))}/></FormControl><FormMessage/></FormItem>
                        )} />
                        <FormField control={stockForm.control} name="min_level" render={({ field }) => (
                          <FormItem><FormLabel>Seuil min</FormLabel><FormControl><Input min={0} type="number" {...field} onChange={(e)=>field.onChange(Number(e.target.value))}/></FormControl><FormMessage/></FormItem>
                        )} />
                        <FormField control={stockForm.control} name="max_level" render={({ field }) => (
                          <FormItem><FormLabel>Seuil max</FormLabel><FormControl><Input min={0} type="number" {...field} onChange={(e)=>field.onChange(Number(e.target.value))}/></FormControl><FormMessage/></FormItem>
                        )} />
                      </div>
                      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={()=>setShowStockDialog(false)}>Annuler</Button><Button type="submit">Ajouter</Button></div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={editStockDialog} onOpenChange={setEditStockDialog}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader><DialogTitle>Modifier le stock</DialogTitle></DialogHeader>
                  <Form {...stockForm}>
                    <form onSubmit={stockForm.handleSubmit(onSaveEdit)} className="space-y-4">
                      <FormField control={stockForm.control} name="qty_on_hand" render={({ field }) => (
                        <FormItem><FormLabel>Qté</FormLabel><FormControl><Input min={0} type="number" {...field} onChange={(e)=>field.onChange(Number(e.target.value))}/></FormControl><FormMessage/></FormItem>
                      )} />
                      <FormField control={stockForm.control} name="min_level" render={({ field }) => (
                        <FormItem><FormLabel>Seuil min</FormLabel><FormControl><Input min={0} type="number" {...field} onChange={(e)=>field.onChange(Number(e.target.value))}/></FormControl><FormMessage/></FormItem>
                      )} />
                      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={()=>setEditStockDialog(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-4">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center"><div className="text-2xl font-bold text-primary">{stocksByStore.length}</div><div className="text-sm text-muted-foreground">Articles en stock</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-destructive">{lowLevel.length}</div><div className="text-sm text-muted-foreground">Alertes seuil bas</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-orange-500">{outOfStock.length}</div><div className="text-sm text-muted-foreground">Rupture de stock</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-success">{stocksByStore.reduce((sum:any, s:any)=> sum + ((s.qty||s.qty_on_hand)||0), 0)}</div><div className="text-sm text-muted-foreground">Unités totales</div></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Mouvement de stock</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Select value={String(storeId)} onValueChange={(v)=>setStoreId(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Magasin" /></SelectTrigger>
                <SelectContent>{stores.map((st:any)=>(<SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>))}</SelectContent>
              </Select>

              <Select value={selectedItem ? String(selectedItem) : undefined} onValueChange={(v)=>setSelectedItem(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Article"/></SelectTrigger>
                <SelectContent>{items.filter((item:any)=> (stocks || []).some((s:any)=> (s.itemId||s.item?.id) === item.id && (s.storeId||s.store?.id) === storeId)).map((it:any)=>(<SelectItem key={it.id} value={String(it.id)}>{it.name}</SelectItem>))}</SelectContent>
              </Select>

              <Select value={type} onValueChange={(v)=>setType(v as any)}>
                <SelectTrigger><SelectValue placeholder="Type"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Entrée (IN)</SelectItem>
                  <SelectItem value="OUT">Sortie (OUT)</SelectItem>
                  <SelectItem value="ADJUST">Ajustement</SelectItem>
                </SelectContent>
              </Select>

              <Input min={0} type="number" value={qty || ''} placeholder="Quantité" onChange={(e)=>setQty(Number(e.target.value))} />

              <Button onClick={doMove} disabled={!selectedItem || qty === 0}>Valider</Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Package className="h-5 w-5"/> Stock du magasin</span>
                  <div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground"/><Input placeholder="Rechercher..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="w-48"/></div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stocksByStore.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Aucun stock trouvé</div>
                  ) : (
                    stocksByStore.map((s:any)=>{
                      const it = s.item || s.Item || (items || []).find((i:any)=> i.id === s.itemId) || {};
                      const low = (s.qty||s.qty_on_hand||0) <= (s.minQty||s.min_level||0);
                      const out = (s.qty||s.qty_on_hand||0) === 0;
                      return (
                        <div key={s.id} className="p-3 border rounded-md flex items-center justify-between hover:bg-accent/50 transition-colors">
                          <div className="flex-1">
                            <div className="font-semibold flex items-center gap-2">{it.name}{out && <AlertTriangle className="h-4 w-4 text-red-500"/>}</div>
                            <div className="text-xs text-muted-foreground">SKU: {it.sku} • Qté: {s.qty||s.qty_on_hand} {it.unit} • Min: {s.minQty||s.min_level} </div>
                            <div className="text-xs text-muted-foreground mt-1">Prix coûtant: {it.costPrice?.toLocaleString?.()} Ar{it.salePriceDefault>0 && ` • Vente: ${it.salePriceDefault.toLocaleString()} Ar`}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {out ? (<Badge variant="destructive">Rupture</Badge>) : low ? (<Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Seuil bas</Badge>) : (<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">OK</Badge>)}
                            <div className="text-xs text-muted-foreground">{(((s.qty||s.qty_on_hand)||0) / ((s.maxQty||s.max_level)||100) * 100).toFixed(0)}% rempli</div>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="ghost" onClick={()=>onEditClick(s)}><Edit2 className="w-4 h-4"/></Button>
                              <Button size="sm" variant="ghost" onClick={()=>onDeleteClick(s.id)}><Trash2 className="w-4 h-4 text-red-600"/></Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500"/> Alertes & Ruptures</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {outOfStock.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-600 mb-2">Ruptures de stock</h4>
                      <div className="space-y-1">
                        {outOfStock.map((s:any)=>{
                          const item = s.item || (items || []).find((i:any)=> i.id === s.itemId) || {};
                          return (
                            <div key={s.id} className="p-2 bg-red-50 border border-red-200 rounded-md text-sm">
                              <div className="font-medium text-red-800">{item.name}</div>
                              <div className="text-red-600 text-xs">Stock épuisé</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {lowLevel.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-orange-600 mb-2">Seuils bas</h4>
                      <div className="space-y-1">
                        {lowLevel.map((s:any)=>{
                          const item = s.item || (items || []).find((i:any)=> i.id === s.itemId) || {};
                          return (
                            <div key={s.id} className="p-2 bg-orange-50 border border-orange-200 rounded-md text-sm">
                              <div className="font-medium text-orange-800">{item.name}</div>
                              <div className="text-orange-600 text-xs">Qté: {s.qty||s.qty_on_hand} / Min: {s.minQty||s.min_level}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {lowLevel.length === 0 && outOfStock.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50"/>
                      <div className="text-sm">Aucune alerte</div>
                      <div className="text-xs">Tous les stocks sont OK</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Derniers mouvements</CardTitle>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4"/>
                  <input type="file" accept=".csv" className="hidden" onChange={(e)=>handleFile(e.target.files?.[0] ?? null)} disabled={importing} />
                  <span className="text-sm text-muted-foreground">Importer CSV</span>
                </label>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {(stock_movements || []).slice(0,100).map((m:any)=>{
                  const it = m.item || (items || []).find((i:any)=>i.id===m.itemId) || {};
                  const st = m.store || (stores || []).find((s:any)=> s.id === m.storeId) || {};
                  return (
                    <div key={m.id} className="p-2 border rounded-md flex items-center justify-between">
                      <div>{m.type} • {it.name} • {m.qty}</div>
                      <div className="text-xs text-muted-foreground">{st.name} • {new Date(m.createdAt||m.created_at).toLocaleString('fr-FR')}</div>
                    </div>
                  );
                })}
                {(stock_movements || []).length === 0 && <div className="text-sm text-muted-foreground">Aucun mouvement</div>}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
