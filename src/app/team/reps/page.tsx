'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, ShoppingCart, TrendingUp, DollarSign, Info, UserCircle } from 'lucide-react';

interface SalesRep {
  id: string;
  nom: string;
  email: string;
  statut: string;
  nbVentes: number;
  ca: number;
  commissions: number;
}

export default function SalesRepsPage() {
  const { user } = useAuth();
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data: users } = await supabase
      .from('utilisateurs')
      .select('id, nom, email, statut')
      .eq('entreprise_id', user!.entrepriseId!)
      .eq('role', 'commercial');

    const { data: ventes } = await supabase
      .from('ventes')
      .select('vendeur_id, total, montant_paye')
      .eq('entreprise_id', user!.entrepriseId!);

    const repList: SalesRep[] = (users ?? []).map((u: any) => {
      const userVentes = (ventes ?? []).filter((v: any) => v.vendeur_id === u.id);
      const ca = userVentes.reduce((s: number, v: any) => s + v.montant_paye, 0);
      return { id: u.id, nom: u.nom, email: u.email, statut: u.statut, nbVentes: userVentes.length, ca, commissions: 0 };
    });

    setReps(repList);
    setLoading(false);
  }

  const totals = reps.reduce((a, r) => ({ ventes: a.ventes + r.nbVentes, ca: a.ca + r.ca }), { ventes: 0, ca: 0 });

  const getStatusBadgeColor = (status: string) =>
    status === 'actif' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tableau de bord / Équipe Commerciale</p>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
            <Users className="h-6 w-6" />Équipe Commerciale
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Info className="h-4 w-4" />Gestion des commerciaux et performance de vente
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">COMMERCIAUX</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{reps.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VENTES TOTAL</CardTitle>
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.ventes}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CHIFFRE D'AFFAIRES</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.ca.toLocaleString('fr-FR')} FCFA</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">COMMISSIONS</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">0 FCFA</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commercial</TableHead>
                <TableHead>Ventes</TableHead>
                <TableHead>CA (FCFA)</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : reps.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun commercial.</TableCell></TableRow>
              ) : reps.map(rep => (
                <TableRow key={rep.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserCircle className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{rep.nom}</div>
                        <div className="text-sm text-muted-foreground">{rep.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{rep.nbVentes}</TableCell>
                  <TableCell>{rep.ca.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeColor(rep.statut)}>{rep.statut}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
