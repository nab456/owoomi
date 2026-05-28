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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const DEFAULT_TAUX = 10;

interface CommissionRep {
  id: string;
  nom: string;
  ca: number;
  taux: number;
  commission: number;
}

export default function CommissionsPage() {
  const { user } = useAuth();
  const [reps, setReps] = useState<CommissionRep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: users }, { data: ventes }] = await Promise.all([
      supabase.from('utilisateurs').select('id, nom').eq('entreprise_id', user!.entrepriseId!).eq('role', 'commercial'),
      supabase.from('ventes').select('vendeur_id, montant_paye').eq('entreprise_id', user!.entrepriseId!),
    ]);

    const repList: CommissionRep[] = (users ?? []).map((u: any) => {
      const ca = (ventes ?? []).filter((v: any) => v.vendeur_id === u.id).reduce((s: number, v: any) => s + v.montant_paye, 0);
      return { id: u.id, nom: u.nom, ca, taux: DEFAULT_TAUX, commission: ca * DEFAULT_TAUX / 100 };
    });

    setReps(repList);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Commissions</h1>
      <Card>
        <CardHeader>
          <CardTitle>Suivi des Commissions</CardTitle>
          <CardDescription>Calculez et suivez les commissions de vos commerciaux.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commercial</TableHead>
                <TableHead>Ventes Totales</TableHead>
                <TableHead>Taux</TableHead>
                <TableHead className="text-right">Commission</TableHead>
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
                      <Avatar><AvatarFallback>{rep.nom.charAt(0)}</AvatarFallback></Avatar>
                      <span>{rep.nom}</span>
                    </div>
                  </TableCell>
                  <TableCell>{rep.ca.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell>{rep.taux.toFixed(2)}%</TableCell>
                  <TableCell className="text-right font-bold text-primary">{rep.commission.toLocaleString('fr-FR')} FCFA</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
