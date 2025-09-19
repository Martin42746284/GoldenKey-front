import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Department } from "@/state/AppState";
import { useState } from "react";
import { Receipt } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n);
}

export default function DailyInvoice() {
  const today = new Date();
  const localYmd = new Date(today.getTime() - today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const [date, setDate] = useState<string>(localYmd);
  const [dept, setDept] = useState<Department>('restaurant');
  const [currency, setCurrency] = useState<'MGA'|'EUR'|'USD'>('MGA');
  const [rates, setRates] = useState<{EUR:number; USD:number}>({ EUR: 5000, USD: 4500 });

  const { data = { lines: [], total: 0 } } = useQuery({
    queryKey: ["report","daily", dept, date],
    queryFn: () => api.get<{lines:any[]; total:number}>(`/reports/daily?dept=${dept}&date=${date}`),
  });
  const lines = data.lines || [];
  const total = data.total || 0;

  const convert = (amountMGA:number) => {
    if (currency === 'MGA') return amountMGA;
    const rate = currency === 'EUR' ? rates.EUR : rates.USD;
    return Math.round(amountMGA / (rate || 1));
  };

  const onPrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const style = `
      <style>
        body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
        h1 { margin: 0 0 8px; }
        .muted { color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
        tfoot td { font-weight: 700; }
      </style>`;
    const rows = lines.map((l:any) => `<tr><td>${l.label}</td><td>${l.qty}</td><td style="text-align:right">${fmt(l.unit)} Ar</td><td style="text-align:right">${fmt(l.total)} Ar</td></tr>`).join('');
    const html = `
      <html><head><meta charset="utf-8"/>${style}</head><body>
        <h1>Facture journalière — ${dept.toUpperCase()}</h1>
        <div class="muted">Date: ${date}</div>
        <table><thead><tr><th>Désignation</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead>
        <tbody>${rows || `<tr><td colspan=4 class="muted">Aucune donnée</td></tr>`}</tbody>
        <tfoot><tr><td colspan=3 style="text-align:right">Total</td><td style="text-align:right">${fmt(total)} Ar</td></tr></tfoot>
        </table>
      </body></html>`;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Receipt className="h-7 w-7"/> Facture journalière</h1>
            <p className="text-muted-foreground">Choisir un département et une date, puis exporter en PDF</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Département</Label>
                <Select value={dept} onValueChange={(v)=>setDept(v as Department)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hôtel</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="pub">Pub/Bar</SelectItem>
                    <SelectItem value="spa">Spa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select value={currency} onValueChange={(v)=> setCurrency(v as any)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MGA">MGA</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {currency !== 'MGA' && (
                <div className="space-y-2">
                  <Label>Taux {currency}/MGA</Label>
                  <Input min={0} type="number" value={currency==='EUR'?rates.EUR:rates.USD} onChange={(e)=> setRates(r => currency==='EUR'? { ...r, EUR: Number(e.target.value)||1 }: { ...r, USD: Number(e.target.value)||1 })} />
                </div>
              )}
              <div className="flex items-end">
                <Button className="w-full" onClick={onPrint}><Receipt className="mr-2 h-4 w-4"/>Exporter PDF</Button>
              </div>
            </CardContent>
          </Card>

          {dept === 'hotel' && (
            <Card>
              <CardHeader><CardTitle>Hôtel</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Aucune donnée de revenus d'hôtel n'est disponible. Définissez les tarifs et la facturation des chambres pour activer ce rapport.
                </div>
              </CardContent>
            </Card>
          )}

          {dept !== 'hotel' && (
            <Card>
              <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b"><th className="text-left p-2">Désignation</th><th className="text-left p-2">Qté</th><th className="text-right p-2">PU</th><th className="text-right p-2">Total</th></tr>
                    </thead>
                    <tbody>
                      {lines.length === 0 && (
                        <tr><td colSpan={4} className="p-2 text-muted-foreground">Aucune donnée</td></tr>
                      )}
                      {lines.map((l:any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">{l.label}</td>
                          <td className="p-2">{l.qty}</td>
                          <td className="p-2 text-right">{fmt(convert(l.unit))} {currency}</td>
                          <td className="p-2 text-right">{fmt(convert(l.total))} {currency}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="p-2 text-right" colSpan={3}>Total</td>
                        <td className="p-2 text-right font-semibold">{fmt(convert(total))} {currency}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
