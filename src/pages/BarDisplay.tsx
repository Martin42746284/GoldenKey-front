import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";


import { api } from "@/lib/api";
import { CreditCard, DollarSign, Wine, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";


import { useNavigate } from "react-router-dom";

export default function BarDisplay() {
  const navigate = useNavigate();
  const { data: tabs = [] } = useQuery({ queryKey: ["bar","tabs"], queryFn: () => api.get<any[]>("/bar/tabs") });

  const grouped = useMemo(() => {
    return {
      unpaid: tabs.filter((t: any) => t.status === "unpaid"),
      open: tabs.filter((t: any) => t.status === "open"),
      paid: tabs.filter((t: any) => t.status === "paid"),
    };
  }, [tabs]);

  const badge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "bg-success/10 text-success border-success/20",
      unpaid: "bg-destructive/10 text-destructive border-destructive/20",
      open: "bg-warning/10 text-warning border-warning/20",
    };
    const labels: Record<string, string> = { paid: "Payé", unpaid: "Impayé", open: "Ouvert" };
    return (
      <Badge variant="outline" className={styles[status]}> {labels[status]} </Badge>
    );
  };



  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Bar • Tickets & Ardoises</h1>
            <p className="text-muted-foreground">Suivi payé / impayé • Paiement uniquement via Bar POS</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {["open", "unpaid", "paid"].map((col) => (
              <Card key={col}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {col === "open" && <Wine className="h-5 w-5" />}
                    {col === "unpaid" && <DollarSign className="h-5 w-5" />}
                    {col === "paid" && <CreditCard className="h-5 w-5" />}
                    {col === "open" ? "Ouverts" : col === "unpaid" ? "Impayés" : "Payés"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(grouped as any)[col].map((t: any) => (
                      <div key={t.id} className="p-3 border rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{t.customerName || t.customer_name}</div>
                          {badge(t.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Solde: {new Intl.NumberFormat('fr-FR').format(t.balance)} MGA</div>
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate('/bar/pos')} disabled={(t.status || '') === 'paid'}>
                            {(t.status || '') === 'paid' ? 'Déjà payé' : (<>
                              Gérer le paiement dans Bar POS <ArrowRight className="h-4 w-4 ml-2" />
                            </>)}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(grouped as any)[col].length === 0 && (
                      <div className="text-sm text-muted-foreground">Aucun ticket</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
