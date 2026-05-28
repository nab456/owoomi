'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getVente } from '@/services/vente';
import type { Vente } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

const statutLabel: Record<string, string> = {
  paye: 'Payé', valide: 'Validé', en_attente: 'En attente', annule: 'Annulé',
};

const getStatusBadgeClass = (statut: string) => {
  if (statut === 'paye') return 'bg-green-100 text-green-800 border-green-200';
  if (statut === 'valide') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (statut === 'annule') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
};

const formatCurrency = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export default function SaleDetailsPage() {
  const params = useParams();
  const [vente, setVente] = useState<Vente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) load(params.id as string);
  }, [params]);

  async function load(id: string) {
    setLoading(true);
    setVente(await getVente(id));
    setLoading(false);
  }

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">Chargement...</div>;
  }

  if (!vente) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Vente introuvable.
        <Button variant="outline" asChild className="mt-4 block mx-auto">
          <Link href="/sales"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link>
        </Button>
      </div>
    );
  }

  const amountPaid = vente.montantPaye;
  const amountDue = vente.total - vente.montantPaye;
  const paymentPct = vente.total > 0 ? (amountPaid / vente.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tableau de bord / Vente / Détails</p>
          <h1 className="text-2xl font-bold mt-1">Détails de la Vente</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Info className="h-4 w-4" />{vente.reference}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/sales"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Articles
                <Badge variant="outline" className={getStatusBadgeClass(vente.statut)}>
                  {statutLabel[vente.statut] ?? vente.statut}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Prix Unitaire</TableHead>
                    <TableHead className="text-center">Quantité</TableHead>
                    <TableHead className="text-center">Remise</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(vente.items ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun article.</TableCell></TableRow>
                  ) : (vente.items ?? []).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium">{item.nomProduit}</div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.prixUnitaire)}</TableCell>
                      <TableCell className="text-center">{item.quantite}</TableCell>
                      <TableCell className="text-center">{item.remise > 0 ? `${item.remise}%` : '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(vente.total)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold">Montant Payé</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(amountPaid)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold text-green-600">Reste à Payer</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(amountDue)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Historique des Paiements</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Référence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(vente.paiements ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun paiement.</TableCell></TableRow>
                  ) : (vente.paiements ?? []).map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : '-'}</TableCell>
                      <TableCell>{p.mode}</TableCell>
                      <TableCell>{formatCurrency(p.montant)}</TableCell>
                      <TableCell>{p.reference ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Client</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="font-bold text-base">{vente.clientNom ?? 'Client général'}</div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between"><span>Type de document:</span> <span className="font-medium">{vente.type === 'ticket' ? 'Ticket de caisse' : 'Facture (A4)'}</span></div>
                <div className="flex justify-between"><span>Date création:</span> <span className="font-medium">{vente.createdAt ? new Date(vente.createdAt).toLocaleString('fr-FR') : '-'}</span></div>
                <div className="flex justify-between"><span>Vendeur:</span> <span className="font-medium">{vente.vendeurNom ?? '-'}</span></div>
              </div>
              {vente.notes && (
                <div className="border-t pt-4">
                  <p className="text-muted-foreground text-xs font-medium mb-1">Notes</p>
                  <p>{vente.notes}</p>
                </div>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/customers">Voir fiche client</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>État du Paiement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span>Payé: {formatCurrency(amountPaid)}</span>
                <span className="font-semibold">{paymentPct.toFixed(0)}%</span>
              </div>
              <Progress value={paymentPct} className="h-2" />
              <div className="space-y-2 text-sm pt-2">
                <div className="flex justify-between"><span>Total:</span> <span className="font-medium">{formatCurrency(vente.total)}</span></div>
                <div className="flex justify-between text-green-600"><span>Reste à payer:</span> <span className="font-medium">{formatCurrency(amountDue)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
