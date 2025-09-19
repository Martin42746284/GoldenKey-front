import { Sidebar as LayoutSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import {
  CalendarDays,
  Users,
  Phone,
  Mail,
  CreditCard,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Trash2
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function FolioPayment({ folioId, onDone }: { folioId: number; onDone?: () => void }) {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'cash'|'card'|'mobile'|'bank'>('cash');
  const pay = useMutation({
    mutationFn: (p:{amount:number; method:'cash'|'card'|'mobile'|'bank'}) => api.post('/cash/payments', { department: 'hotel', method: p.method, amount: p.amount, folioId }),
    onSuccess: () => { toast({ title: 'Paiement enregistré' }); setAmount(0); onDone?.(); },
    onError: (e:any) => toast({ title: 'Erreur paiement', description: String(e), variant: 'destructive' }),
  });
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      <Input type="number" placeholder="Montant" value={amount || ''} onChange={(e)=> setAmount(Number(e.target.value))} />
      <Select value={method} onValueChange={(v)=> setMethod(v as any)}>
        <SelectTrigger><SelectValue placeholder="Méthode"/></SelectTrigger>
        <SelectContent>
          <SelectItem value="cash">Espèces</SelectItem>
          <SelectItem value="card">Carte</SelectItem>
          <SelectItem value="mobile">Mobile Money</SelectItem>
          <SelectItem value="bank">Virement</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={()=> amount>0 && pay.mutate({ amount, method })}>Encaisser</Button>
    </div>
  );
}

interface Reservation {
  id: number;
  room: {
    id: number;
    number: string;
    type: string;
    status: string;
  };
  guest: {
    id: number;
    fullName: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
  };
  checkIn: string;
  checkOut: string;
  status: 'booked' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  rate: number;
  folio?: {
    id: number;
    total: number;
    balance: number;
    payments: Array<{
      id: number;
      amount: number;
      method: string;
    }>;
  };
  createdAt: string;
}

const Reservations = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Récupération des réservations
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => api.get<Reservation[]>('/hotel/reservations')
  });

  // Récupération des chambres disponibles
  const { data: rooms = [] } = useQuery<Array<{
    id: number;
    number: string;
    type: string;
    status: string;
  }>>({
    queryKey: ['rooms'],
    queryFn: () => api.get('/hotel/rooms')
  });

  // Formulaire nouvelle réservation
  const [newReservation, setNewReservation] = useState({
    guestName: '',
    email: '',
    phone: '',
    nationality: '',
    roomId: '',
    roomType: '',
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
    rate: 0,
    currency: 'MGA',
    source: 'direct',
    specialRequests: '',
    notes: ''
  });

  // Mutation pour créer une réservation
  const createReservationMutation = useMutation({
    mutationFn: (data: any) => api.post('/hotel/reservations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast({
        title: "Réservation créée",
        description: "La réservation a été créée avec succès"
      });
      setShowNewReservation(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      booked: "bg-success/10 text-success border-success/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
      checked_in: "bg-primary/10 text-primary border-primary/20",
      checked_out: "bg-muted text-muted-foreground border-muted",
      no_show: "bg-warning/10 text-warning border-warning/20",
    } as Record<string, string>;

    const labels = {
      booked: 'Confirmée',
      cancelled: 'Annulée',
      checked_in: 'Arrivée',
      checked_out: 'Partie',
      no_show: 'No-show'
    } as Record<string, string>;

    return (
      <Badge variant="outline" className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    const labels = {
      direct: 'Direct',
      ota: 'OTA',
      agency: 'Agence',
      phone: 'Téléphone',
      walkin: 'Walk-in'
    } as Record<string, string>;

    return (
      <Badge variant="secondary" className="text-xs">
        {labels[source] || source}
      </Badge>
    );
  };

  const handleCreateReservation = async () => {
    try {
      // Liste des champs obligatoires à vérifier
      const missingFields = [];
      if (!newReservation.guestName) missingFields.push("Nom du client");
      if (!newReservation.checkIn) missingFields.push("Date d'arrivée");
      if (!newReservation.checkOut) missingFields.push("Date de départ");
      if (!newReservation.roomId) missingFields.push("Chambre");
      
      if (missingFields.length > 0) {
        toast({
          title: "Erreur",
          description: `Veuillez remplir les champs obligatoires suivants : ${missingFields.join(", ")}`,
          variant: "destructive"
        });
        return;
      }

      // Vérifier si le tarif est valide
      if (newReservation.rate <= 0) {
        toast({
          title: "Erreur",
          description: "Veuillez entrer un tarif valide",
          variant: "destructive"
        });
        return;
      }
      
      // Validation de la cohérence des dates
      const checkIn = new Date(newReservation.checkIn);
      const checkOut = new Date(newReservation.checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        toast({
          title: "Erreur",
          description: "Les dates saisies ne sont pas valides",
          variant: "destructive"
        });
        return;
      }

      if (checkIn < today) {
        toast({
          title: "Erreur",
          description: "La date d'arrivée ne peut pas être dans le passé",
          variant: "destructive"
        });
        return;
      }
      
      if (checkIn >= checkOut) {
        toast({
          title: "Erreur",
          description: "La date de départ doit être postérieure à la date d'arrivée",
          variant: "destructive"
        });
        return;
      }

      try {
        const selectedId = parseInt(newReservation.roomId);
        if (!selectedId) {
          throw new Error("Veuillez sélectionner une chambre");
        }

        // Préparation des données de réservation
        const reservationData = {
          roomId: selectedId,
          guest: {
            fullName: newReservation.guestName.trim(),
            email: newReservation.email ? newReservation.email.trim() : "",
            phone: newReservation.phone ? newReservation.phone.trim() : ""
          },
          checkIn: new Date(newReservation.checkIn).toISOString(),
          checkOut: new Date(newReservation.checkOut).toISOString(),
          status: 'booked' as const,
          rate: parseInt(newReservation.rate.toString())
        };

        // Création de la réservation
        await createReservationMutation.mutateAsync(reservationData);

        // Reset formulaire
        setNewReservation({
          guestName: '',
          email: '',
          phone: '',
          nationality: '',
          roomId: '',
          roomType: '',
          checkIn: '',
          checkOut: '',
          adults: 1,
          children: 0,
          rate: 0,
          currency: 'MGA',
          source: 'direct',
          specialRequests: '',
          notes: ''
        });

      } catch (error: any) {
        console.error('Erreur lors de la création de la réservation:', error);
        toast({
          title: "Erreur",
          description: error.message || "Une erreur est survenue lors de la création de la réservation",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la création de la réservation",
        variant: "destructive"
      });
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const statusMap: Record<string, Reservation['status'] | null> = {
      all: null,
      confirmed: 'booked',
      pending: 'booked',
      cancelled: 'cancelled',
      checkedin: 'checked_in',
      checkedout: 'checked_out',
    };
    const target = statusMap[filterStatus] ?? null;
    const matchesStatus = target === null || reservation.status === target;
    const term = searchTerm.toLowerCase();
    const matchesSearch = reservation.guest.fullName.toLowerCase().includes(term) ||
                         reservation.room.number.includes(term) ||
                         reservation.id.toString().includes(term);
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'booked').length,
    pending: reservations.filter(r => r.status === 'booked').length,
    checkedin: reservations.filter(r => r.status === 'checked_in').length
  };

  // Mutations pour les actions sur les réservations
  const updateReservationStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => {
      if (status === 'checked_in') return api.post(`/hotel/reservations/${id}/checkin`);
      if (status === 'checked_out') return api.post(`/hotel/reservations/${id}/checkout`);
      return api.patch(`/hotel/reservations/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast({ title: "Statut mis à jour" });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteReservation = useMutation({
    mutationFn: (id: number) => api.del(`/hotel/reservations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast({ title: "Réservation supprimée" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  return (
    <div className="flex h-screen bg-background">
      <LayoutSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Réservations
                </h1>
                <p className="text-muted-foreground">
                  Gestion complète des réservations • Multi-canaux • Confirmations automatiques
                </p>
              </div>
              <Dialog open={showNewReservation} onOpenChange={setShowNewReservation}>
                <DialogTrigger asChild>
                  <Button className="bg-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Réservation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Créer une Nouvelle Réservation</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="guestName">Nom du client *</Label>
                        <Input
                          id="guestName"
                          value={newReservation.guestName}
                          onChange={(e) => setNewReservation({...newReservation, guestName: e.target.value})}
                          placeholder="Nom complet"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nationality">Nationalité</Label>
                        <Select value={newReservation.nationality} onValueChange={(value) => setNewReservation({...newReservation, nationality: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Malagasy">Madagascar</SelectItem>
                            <SelectItem value="Français">France</SelectItem>
                            <SelectItem value="Mauricien">Maurice</SelectItem>
                            <SelectItem value="Réunionais">Réunion</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newReservation.email}
                          onChange={(e) => setNewReservation({...newReservation, email: e.target.value})}
                          placeholder="email@exemple.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input
                          id="phone"
                          value={newReservation.phone}
                          onChange={(e) => setNewReservation({...newReservation, phone: e.target.value})}
                          placeholder="+261 34 12 345 67"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkin">Arrivée *</Label>
                        <Input
                          id="checkin"
                          type="date"
                          value={newReservation.checkIn}
                          onChange={(e) => setNewReservation({...newReservation, checkIn: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkout">Départ *</Label>
                        <Input
                          id="checkout"
                          type="date"
                          value={newReservation.checkOut}
                          onChange={(e) => setNewReservation({...newReservation, checkOut: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="adults">Adultes</Label>
                        <Select value={newReservation.adults.toString()} onValueChange={(value) => setNewReservation({...newReservation, adults: parseInt(value)})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="children">Enfants</Label>
                        <Select value={newReservation.children.toString()} onValueChange={(value) => setNewReservation({...newReservation, children: parseInt(value)})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roomType">Type de chambre</Label>
                        <Select value={newReservation.roomType} onValueChange={(value) => setNewReservation({...newReservation, roomType: value, roomId: ''})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Standard">Standard</SelectItem>
                            <SelectItem value="Deluxe">Deluxe</SelectItem>
                            <SelectItem value="Suite">Suite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="roomId">Chambre</Label>
                        <Select value={newReservation.roomId} onValueChange={(value) => setNewReservation({...newReservation, roomId: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner la chambre" />
                          </SelectTrigger>
                          <SelectContent>
                            {rooms
                              .filter(r => r.status === 'available' && (!newReservation.roomType || r.type === newReservation.roomType))
                              .map((r) => (
                                <SelectItem key={r.id} value={String(r.id)}>
                                  Chambre {r.number} — {r.type}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rate">Tarif par nuit</Label>
                        <Input
                          id="rate"
                          type="number"
                          min={0}
                          value={newReservation.rate}
                          onChange={(e) => setNewReservation({...newReservation, rate: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Devise</Label>
                        <Select value={newReservation.currency} onValueChange={(value: any) => setNewReservation({...newReservation, currency: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MGA">MGA (Ariary)</SelectItem>
                            <SelectItem value="EUR">EUR (Euro)</SelectItem>
                            <SelectItem value="USD">USD (Dollar)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="source">Source</Label>
                        <Select value={newReservation.source} onValueChange={(value) => setNewReservation({...newReservation, source: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct">Direct</SelectItem>
                            <SelectItem value="ota">OTA</SelectItem>
                            <SelectItem value="agency">Agence</SelectItem>
                            <SelectItem value="phone">Téléphone</SelectItem>
                            <SelectItem value="walkin">Walk-in</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialRequests">Demandes spéciales</Label>
                      <Textarea
                        id="specialRequests"
                        value={newReservation.specialRequests}
                        onChange={(e) => setNewReservation({...newReservation, specialRequests: e.target.value})}
                        placeholder="Lit bébé, chambre calme, étage élevé..."
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowNewReservation(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleCreateReservation}>
                        Créer la Réservation
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Réservations"
              value={stats.total.toString()}
              icon={CalendarDays}
              variant="default"
            />
            <StatCard
              title="Confirmées"
              value={stats.confirmed.toString()}
              icon={CheckCircle}
              variant="success"
            />
            <StatCard
              title="En Attente"
              value={stats.pending.toString()}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="Arrivées Aujourd'hui"
              value={stats.checkedin.toString()}
              icon={Users}
              variant="default"
            />
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, chambre ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-80"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="confirmed">Confirmées</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="cancelled">Annulées</SelectItem>
                      <SelectItem value="checkedin">Arrivées</SelectItem>
                      <SelectItem value="checkedout">Parties</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reservations List */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des Réservations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredReservations.map((reservation) => (
                    <div
                    key={reservation.id}
                    className="p-6 border border-border rounded-xl hover:shadow-elegant transition-all duration-200 bg-card"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{reservation.guest.fullName}</h3>
                          <p className="text-sm text-muted-foreground">#{reservation.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(reservation.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <div className="font-medium">Séjour</div>
                          <div className="text-muted-foreground">
                            {format(new Date(reservation.checkIn), 'dd MMM', { locale: fr })} - {format(new Date(reservation.checkOut), 'dd MMM yyyy', { locale: fr })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <div className="font-medium">Chambre {reservation.room.number}</div>
                          <div className="text-muted-foreground">{reservation.room.type}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <div className="font-medium">Créée le</div>
                          <div className="text-muted-foreground">
                            {format(new Date(reservation.createdAt), 'dd/MM/yyyy', { locale: fr })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <div className="font-medium">{new Intl.NumberFormat('fr-FR').format(reservation.rate)} MGA</div>
                          <div className="text-muted-foreground">
                            Solde: {new Intl.NumberFormat('fr-FR').format(reservation.folio?.balance ?? reservation.rate)} MGA
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {reservation.guest.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{reservation.guest.email}</span>
                          </div>
                        )}
                        {reservation.guest.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{reservation.guest.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {reservation.status === 'booked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReservationStatus.mutate({
                              id: reservation.id,
                              status: 'checked_in'
                            })}
                          >
                            Check-in
                          </Button>
                        )}
                        {reservation.status === 'checked_in' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReservationStatus.mutate({
                              id: reservation.id,
                              status: 'checked_out'
                            })}
                          >
                            Check-out
                          </Button>
                        )}
                        {reservation.status !== 'booked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReservationStatus.mutate({ id: reservation.id, status: 'booked' })}
                          >
                            Confirmer
                          </Button>
                        )}
                        {reservation.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReservationStatus.mutate({ id: reservation.id, status: 'cancelled' })}
                          >
                            Annuler
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedReservation(reservation); setDetailsOpen(true); }}
                        >
                          Détails
                        </Button>
                        {((['checked_out','cancelled','no_show'] as string[]).includes(reservation.status) || new Date(reservation.checkOut) < new Date()) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Supprimer cette réservation ?')) {
                                deleteReservation.mutate(reservation.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                          </Button>
                        )}
                      </div>
                    </div>

                    {reservation.guest.notes && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm">
                          <span className="font-medium">Notes:</span> {reservation.guest.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}                {filteredReservations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune réservation trouvée
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Reservation Details Dialog */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Détails Réservation {selectedReservation ? `#${selectedReservation.id}` : ''}
                </DialogTitle>
                <DialogDescription>
                  {selectedReservation?.guest.fullName || ''} • Chambre {selectedReservation?.room.number}
                </DialogDescription>
              </DialogHeader>

              {selectedReservation && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Séjour</div>
                      <div className="text-sm">
                        {format(new Date(selectedReservation.checkIn), 'dd MMM yyyy', { locale: fr })} → {format(new Date(selectedReservation.checkOut), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Statut</div>
                      {getStatusBadge(selectedReservation.status)}
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Contact</div>
                      <div className="text-sm space-y-1">
                        {selectedReservation.guest.email && (<div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {selectedReservation.guest.email}</div>)}
                        {selectedReservation.guest.phone && (<div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {selectedReservation.guest.phone}</div>)}
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Tarif</div>
                      <div className="text-sm font-semibold">{new Intl.NumberFormat('fr-FR').format(selectedReservation.rate)} MGA</div>
                    </div>
                  </div>

                  {selectedReservation.folio && (
                    <div className="rounded-md border p-3 space-y-3">
                      <div className="text-sm font-medium">Folio</div>
                      <div className="grid grid-cols-3 text-sm">
                        <div>Total</div>
                        <div className="text-right col-span-2">{new Intl.NumberFormat('fr-FR').format(selectedReservation.folio.total)} MGA</div>
                        <div>Solde</div>
                        <div className="text-right col-span-2">{new Intl.NumberFormat('fr-FR').format(selectedReservation.folio.balance)} MGA</div>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="text-sm font-medium mb-2">Paiements</div>
                        <div className="space-y-1 text-sm">
                          {(selectedReservation.folio.payments || []).map(p => (
                            <div key={p.id} className="flex justify-between"><span>{p.method}</span><span>{new Intl.NumberFormat('fr-FR').format(p.amount)} MGA</span></div>
                          ))}
                          {(!selectedReservation.folio.payments || selectedReservation.folio.payments.length === 0) && (
                            <div className="text-muted-foreground text-sm">Aucun paiement</div>
                          )}
                        </div>
                        <FolioPayment folioId={selectedReservation.folio.id} onDone={()=>{ queryClient.invalidateQueries({ queryKey: ['reservations'] }); }}/>
                      </div>
                    </div>
                  )}

                  {selectedReservation.guest.notes && (
                    <div className="rounded-md border p-3">
                      <div className="text-sm font-medium mb-1">Notes</div>
                      <div className="text-sm">{selectedReservation.guest.notes}</div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    {selectedReservation.status === 'booked' && (
                      <Button variant="outline" onClick={() => updateReservationStatus.mutate({ id: selectedReservation.id, status: 'checked_in' })}>
                        Check-in
                      </Button>
                    )}
                    {selectedReservation.status === 'checked_in' && (
                      <Button variant="outline" onClick={() => updateReservationStatus.mutate({ id: selectedReservation.id, status: 'checked_out' })}>
                        Check-out
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fermer</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default Reservations;
