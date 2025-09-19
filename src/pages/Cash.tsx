import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/rbac";
import { api } from "@/lib/api";
import { DollarSign } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export default function Cash() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dept, setDept] = useState<'hotel'|'restaurant'|'pub'|'spa'>('restaurant');
  const [opening, setOpening] = useState<number>(50000);
  const [closing, setClosing] = useState<number>(0);

  const { data: sessions = [] } = useQuery({
    queryKey: ["cash","sessions", dept],
    queryFn: () => api.get<any[]>(`/cash/sessions?dept=${dept}`),
    refetchInterval: 10000,
  });

  const perDept = useMemo(() => sessions, [sessions]);
  const open = perDept.find((c: any) => c.status === 'open');

  const openMut = useMutation({
    mutationFn: () => api.post(`/cash/sessions/open`, { department: dept, openingFloat: opening, openedBy: user.username }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash","sessions", dept] }); toast({ title: 'Session ouverte', description: 'La session de caisse est ouverte.' }); },
    onError: (err:any) => toast({ title: 'Erreur ouverture', description: String(err), variant: 'destructive' }),
  });
  const closeMut = useMutation({
    mutationFn: () => open ? api.post(`/cash/sessions/${open.id}/close`, { closingAmount: closing }) : Promise.resolve(null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash","sessions", dept] }); toast({ title: 'Session clôturée', description: 'La session a été clôturée.' }); },
    onError: (err:any) => toast({ title: 'Erreur clôture', description: String(err), variant: 'destructive' }),
  });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Caisse & Clôture</h1>
            <p className="text-muted-foreground">Sessions de caisse par département • X/Z</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Département</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              {(['hotel','restaurant','pub','spa'] as const).map(d => (
                <Button key={d} variant={dept===d? 'default':'outline'} onClick={()=>setDept(d)}>{d}</Button>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5"/> Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!open && (
                  <div className="flex items-center gap-2">
                    <Input min={0} type="number" value={opening || ''} onChange={(e)=>setOpening(Number(e.target.value))} placeholder="Fond de caisse (Ar)" />
                    <Button onClick={()=>openMut.mutate()}>Ouvrir</Button>
                  </div>
                )}
                {open && (
                  <div className="flex items-center gap-2">
                    <Input min={0} type="number" value={closing || ''} onChange={(e)=>setClosing(Number(e.target.value))} placeholder="Clôture (Ar)" />
                    <Button onClick={()=>closeMut.mutate()}>Clôturer</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {perDept.slice().reverse().map((c: any) => (
                  <div key={c.id} className="p-2 border rounded-md flex items-center justify-between">
                    <div>{c.status === 'open' ? 'Ouverte' : 'Fermée'} • {c.openedBy || c.opened_by}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(c.openedAt || c.opened_at).toLocaleString('fr-FR')}
                      {(c.closedAt || c.closed_at) ? ` → ${new Date(c.closedAt || c.closed_at).toLocaleString('fr-FR')}` : ''}
                    </div>
                  </div>
                ))}
                {perDept.length===0 && <div className="text-sm text-muted-foreground">Aucune session</div>}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
