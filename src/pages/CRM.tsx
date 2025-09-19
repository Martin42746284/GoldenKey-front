import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Users,
  Gift,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Heart,
  Award,
  Plus,
  Search,
  MessageSquare,
} from "lucide-react";
import { Trash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface CrmCustomer {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  visitCount: number;
  lastVisit?: string | null;
  totalSpent: number;
  source?: "hotel" | "spa" | "bar" | "restaurant";
}

const CRM = () => {
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("customers");
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("crmHiddenCustomers") || "[]"); } catch { return []; }
  });

  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<CrmCustomer[]>("/crm/customers");
      setCustomers(data);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de charger les clients", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    try { localStorage.setItem("crmHiddenCustomers", JSON.stringify(hiddenIds)); } catch {}
  }, [hiddenIds]);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const base = !term ? customers : customers.filter((c) =>
      c.fullName.toLowerCase().includes(term) ||
      (c.email || "").toLowerCase().includes(term) ||
      String(c.id).toLowerCase().includes(term)
    );
    return base.filter((c) => !hiddenIds.includes(c.id));
  }, [customers, searchTerm, hiddenIds]);

  const handleCreateCustomer = async () => {
    const fullName = `${newCustomer.firstName} ${newCustomer.lastName}`.trim();
    if (!fullName || !newCustomer.email) {
      toast({ title: "Champs manquants", description: "Nom complet et email requis", variant: "destructive" });
      return;
    }
    try {
      const created = await api.post<CrmCustomer>("/crm/customers", {
        fullName,
        email: newCustomer.email || undefined,
        phone: newCustomer.phone || undefined,
        notes: newCustomer.notes || undefined,
      });
      setCustomers((prev) => [created, ...prev]);
      toast({ title: "Client créé", description: created.fullName });
      setNewCustomer({ firstName: "", lastName: "", email: "", phone: "", notes: "" });
      setShowNewCustomer(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de créer le client", variant: "destructive" });
    }
  };

  const handleDelete = async (row: CrmCustomer) => {
    const idStr = String(row.id);
    if (!idStr.startsWith("hotel:")) {
      handleHide(row);
      return;
    }
    const idNum = Number(idStr.split(":")[1]);
    try {
      await api.del<void>(`/hotel/guests/${idNum}`);
      setCustomers((prev) => prev.filter((c) => c.id !== row.id));
      if (selectedCustomer && selectedCustomer.id === row.id) setSelectedCustomer(null);
      toast({ title: "Client supprimé", description: row.fullName });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de supprimer le client", variant: "destructive" });
    }
  };

  const handleHide = (row: CrmCustomer) => {
    setHiddenIds((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]));
    if (selectedCustomer && selectedCustomer.id === row.id) setSelectedCustomer(null);
    toast({ title: "Masqué", description: `${row.fullName} est masqué dans le CRM` });
  };

  const stats = useMemo(() => {
    const total = customers.length;
    const totalVisits = customers.reduce((s, c) => s + (c.visitCount || 0), 0);
    const totalSpent = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);
    const last = customers
      .map((c) => (c.lastVisit ? new Date(c.lastVisit) : null))
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return { total, totalVisits, totalSpent, lastVisit: last ? last.toLocaleDateString() : "—" };
  }, [customers]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">CRM & Relation Client</h1>
                <p className="text-muted-foreground">Base clients • Séjours • Communications</p>
              </div>
              <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
                <DialogTrigger asChild>
                  <Button className="bg-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Créer un Nouveau Client</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom *</Label>
                        <Input id="firstName" value={newCustomer.firstName} onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })} placeholder="Prénom" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom *</Label>
                        <Input id="lastName" value={newCustomer.lastName} onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })} placeholder="Nom de famille" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="email@exemple.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input id="phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="+261 34 12 345 67" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea id="notes" value={newCustomer.notes} onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })} placeholder="Préférences, historique, informations importantes..." rows={3} />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowNewCustomer(false)}>Annuler</Button>
                      <Button onClick={handleCreateCustomer}>Créer le Client</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Clients" value={String(stats.total)} icon={Users} variant="default" />
            <StatCard title="Total Séjours" value={String(stats.totalVisits)} icon={Calendar} variant="default" />
            <StatCard title="Dépense Totale" value={`${new Intl.NumberFormat("fr-FR").format(stats.totalSpent)} Ar`} icon={TrendingUp} variant="default" />
            <StatCard title="Dernière visite" value={stats.lastVisit} icon={Award} variant="gold" />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="customers">Clients</TabsTrigger>
              <TabsTrigger value="loyalty">Fidélité</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="customers" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Rechercher par nom, email ou ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-80" />
                    </div>
                    {loading && <Badge variant="outline">Chargement…</Badge>}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id} className="hover:shadow-elegant transition-all duration-200">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{customer.fullName}</CardTitle>
                            <p className="text-sm text-muted-foreground">ID: {customer.id}</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{customer.email || "—"}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{customer.phone || "—"}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{customer.visitCount} séjour(s)</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Gift className="h-4 w-4 text-muted-foreground" />
                          <span>{new Intl.NumberFormat("fr-FR").format(customer.totalSpent)} Ar dépensés</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <Button size="sm" variant="outline" onClick={() => setSelectedCustomer(customer)}>
                          Voir Profil
                        </Button>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{String(customer.id).startsWith("hotel:") ? "Supprimer ce client ?" : "Masquer ce client ?"}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {String(customer.id).startsWith("hotel:")
                                    ? "Cette action est irréversible. Le client sera définitivement supprimé."
                                    : "Ce client sera masqué dans la vue CRM. Les données sources ne seront pas supprimées."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(customer)}>
                                  {String(customer.id).startsWith("hotel:") ? "Supprimer" : "Masquer"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Dialog open={!!selectedCustomer} onOpenChange={(o) => { if (!o) setSelectedCustomer(null); }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Profil Client</DialogTitle>
                  </DialogHeader>
                  {selectedCustomer && (
                    <div className="grid gap-2 py-2 text-sm">
                      <div className="font-semibold text-lg">{selectedCustomer.fullName}</div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCustomer.email || "—"}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCustomer.phone || "—"}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCustomer.visitCount} séjour(s)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Gift className="h-4 w-4 text-muted-foreground" />
                        <span>{new Intl.NumberFormat("fr-FR").format(selectedCustomer.totalSpent)} Ar dépensés</span>
                      </div>
                      <div className="text-muted-foreground">
                        Dernière visite: {selectedCustomer.lastVisit ? new Date(selectedCustomer.lastVisit).toLocaleString("fr-FR") : "—"}
                      </div>
                      {selectedCustomer.notes ? (
                        <div className="text-muted-foreground">Notes: {selectedCustomer.notes}</div>
                      ) : null}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="loyalty" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Gift className="mr-2 h-5 w-5 text-orange-500" />
                      Programme Bronze
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">0 - 999 points</p>
                      <div className="text-2xl font-bold">—</div>
                      <p className="text-xs text-muted-foreground">membres actifs</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="mr-2 h-5 w-5 text-yellow-500" />
                      Programme Gold
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">2500+ points</p>
                      <div className="text-2xl font-bold">—</div>
                      <p className="text-xs text-muted-foreground">membres actifs</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Heart className="mr-2 h-5 w-5 text-primary" />
                      Fidélisation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Fonctionnalités avancées à venir</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="marketing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campagnes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Intégration emailing/SMS à configurer</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Taux de fidélisation" value="—" icon={Heart} trend={{ value: 0, isPositive: true }} variant="success" />
                <StatCard title="Panier moyen" value="—" icon={TrendingUp} trend={{ value: 0, isPositive: true }} variant="default" />
                <StatCard title="Fréquence de visite" value="—" icon={Calendar} trend={{ value: 0, isPositive: true }} variant="default" />
                <StatCard title="LTV moyen" value="—" icon={Award} trend={{ value: 0, isPositive: true }} variant="gold" />
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default CRM;
