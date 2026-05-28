'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { listMouvements } from '@/services/mouvement-stock';
import type { MouvementStock } from '@/types';

export default function StockMovementsPage() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<MouvementStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.entrepriseId) load();
  }, [user]);

  async function load() {
    setLoading(true);
    setMovements(await listMouvements());
    setLoading(false);
  }

  const getTypeBadgeClass = (type: string) =>
    type === 'entree' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  const typeLabel = (type: string) => {
    if (type === 'entree') return 'Entrée';
    if (type === 'sortie') return 'Sortie';
    return 'Ajustement';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mouvements de Stock</CardTitle>
        <Button asChild variant="outline">
          <Link href="/products/stock-levels">
            <ArrowLeft className="h-4 w-4 mr-2" />Voir Niveaux de Stock
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : movements.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun mouvement enregistré.</TableCell></TableRow>
            ) : movements.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR') : '-'}</TableCell>
                <TableCell>
                  <div className="font-medium">{m.produitNom ?? m.produitId}</div>
                </TableCell>
                <TableCell>{m.quantite.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge className={`${getTypeBadgeClass(m.type)} border-none`}>{typeLabel(m.type)}</Badge>
                </TableCell>
                <TableCell>
                  <div>{m.userNom ?? m.userId ?? '-'}</div>
                </TableCell>
                <TableCell>{m.reference ?? '-'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
