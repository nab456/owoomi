'use client';
import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, PlusCircle, Eye, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { listVentes, deleteVente } from '@/services/vente';
import type { Vente } from '@/types';

export default function SalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.entrepriseId) load();
  }, [user]);

  async function load() {
    setLoading(true);
    setSales(await listVentes());
    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    await deleteVente(id);
    setSales(prev => prev.filter(s => s.id !== id));
  };

  const getStatusBadge = (statut: string) => {
    if (statut === 'paye') return 'bg-green-100 text-green-800 border-green-200';
    if (statut === 'valide') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (statut === 'annule') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800';
  };

  const statutLabel = (s: string) => {
    if (s === 'paye') return 'Payé';
    if (s === 'valide') return 'Validé';
    if (s === 'annule') return 'Annulé';
    return 'En attente';
  };

  const pctPaye = (v: Vente) => v.total > 0 ? Math.round((v.montantPaye / v.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Tableau de bord / Vente</p>
            <CardTitle>Gestion des Ventes</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Info className="h-3 w-3" />Liste complète des ventes enregistrées
            </CardDescription>
          </div>
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
            <Link href="/sales/new">
              <PlusCircle className="h-4 w-4 mr-2" />Nouvelle Vente
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead>Vendeur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : sales.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Aucune vente enregistrée.</TableCell></TableRow>
            ) : sales.map((sale) => {
              const pct = pctPaye(sale);
              return (
                <TableRow key={sale.id}>
                  <TableCell>
                    <div>{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('fr-FR') : '-'}</div>
                    <div className="text-xs text-muted-foreground">{sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                  </TableCell>
                  <TableCell className="font-medium">{sale.reference}</TableCell>
                  <TableCell>{sale.type === 'ticket' ? 'Ticket (A4)' : 'Facture (A4)'}</TableCell>
                  <TableCell>{sale.clientNom ?? 'Non spécifié'}</TableCell>
                  <TableCell>{sale.total.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadge(sale.statut)}>{statutLabel(sale.statut)}</Badge>
                  </TableCell>
                  <TableCell>
                    {pct < 100 ? (
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2" /><span>{pct}%</span>
                      </div>
                    ) : 'Complet'}
                  </TableCell>
                  <TableCell>{sale.vendeurNom ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="icon" variant="outline" className="h-8 w-8 rounded-full border-blue-500 text-blue-500 hover:bg-blue-50">
                        <Link href={`/sales/${sale.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-yellow-500 text-yellow-500 hover:bg-yellow-50">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-red-500 text-red-500 hover:bg-red-50" onClick={() => handleDelete(sale.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
