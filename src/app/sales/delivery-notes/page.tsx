'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Printer, Check, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { listBonsLivraison, updateBonStatut } from '@/services/bon-livraison';
import type { BonLivraison } from '@/types';

export default function DeliveryNotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<BonLivraison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.entrepriseId) load();
  }, [user]);

  async function load() {
    setLoading(true);
    setNotes(await listBonsLivraison());
    setLoading(false);
  }

  const handleStatut = async (id: string, statut: BonLivraison['statut']) => {
    await updateBonStatut(id, statut);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, statut } : n));
  };

  const getStatusBadge = (statut: string) => {
    if (statut === 'livre') return 'bg-green-100 text-green-800 border-green-200';
    if (statut === 'en_preparation') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800';
  };

  const statutLabel = (s: string) => {
    if (s === 'livre') return 'Livré';
    if (s === 'en_preparation') return 'En préparation';
    return 'Annulé';
  };

  const generatePdf = async (n: BonLivraison) => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text('Bon de Livraison', 14, 22);
    doc.setFontSize(12);
    doc.text(`Référence: ${n.reference}`, 14, 32);
    doc.text(`Date: ${n.createdAt ? new Date(n.createdAt).toLocaleString('fr-FR') : '-'}`, 14, 40);
    doc.text(`Client: ${n.clientNom ?? 'Non spécifié'}`, 14, 48);
    doc.text(`Statut: ${statutLabel(n.statut)}`, 14, 56);
    doc.save(`BL_${n.reference}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <p className="text-sm text-muted-foreground">Tableau de bord / Bons de Livraison</p>
          <CardTitle>Bons de Livraison</CardTitle>
          <CardDescription className="flex items-center gap-1 mt-1">
            <Info className="h-3 w-3" />Liste des bons de livraison enregistrés
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé par</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : notes.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun bon de livraison.</TableCell></TableRow>
            ) : notes.map((note) => (
              <TableRow key={note.id}>
                <TableCell>{note.createdAt ? new Date(note.createdAt).toLocaleString('fr-FR') : '-'}</TableCell>
                <TableCell className="font-medium">{note.reference}</TableCell>
                <TableCell>{note.clientNom ?? 'Non spécifié'}</TableCell>
                <TableCell>{note.nbArticles ?? 0}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusBadge(note.statut)}>{statutLabel(note.statut)}</Badge>
                </TableCell>
                <TableCell>{note.createdByNom ?? '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button onClick={() => generatePdf(note)} size="icon" variant="outline" className="h-8 w-8 rounded-md border-blue-500 text-blue-500 hover:bg-blue-50">
                      <Printer className="h-4 w-4" />
                    </Button>
                    {note.statut === 'en_preparation' && (
                      <>
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-md border-green-500 text-green-500 hover:bg-green-50" onClick={() => handleStatut(note.id, 'livre')}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-md border-red-500 text-red-500 hover:bg-red-50" onClick={() => handleStatut(note.id, 'annule')}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{notes.length} bon(s)</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Précédent</Button>
          <Button variant="default" size="sm" className="w-8 h-8 p-0">1</Button>
          <Button variant="outline" size="sm">Suivant</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
