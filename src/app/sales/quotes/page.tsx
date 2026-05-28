'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, PlusCircle, Printer, Copy, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { listDevis, duplicateDevis, deleteDevis, convertirDevisEnVente } from '@/services/devis';
import type { Devis } from '@/types';

const statutLabel: Record<string, string> = {
  brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé', expire: 'Expiré',
};
const statutBadge: Record<string, string> = {
  brouillon: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  envoye: 'bg-blue-100 text-blue-800 border-blue-200',
  accepte: 'bg-green-100 text-green-800 border-green-200',
  refuse: 'bg-red-100 text-red-800 border-red-200',
  expire: 'bg-gray-100 text-gray-800',
};

export default function QuotesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string | null>(null);

  useEffect(() => {
    if (user?.entrepriseId) load();
  }, [user]);

  async function load() {
    setLoading(true);
    setQuotes(await listDevis());
    setLoading(false);
  }

  const handleDuplicate = async (q: Devis) => {
    if (!user?.entrepriseId) return;
    await duplicateDevis(q.id, user.entrepriseId);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteDevis(id);
    load();
  };

  const handleConvertir = async (q: Devis) => {
    if (!user?.entrepriseId) return;
    setConverting(q.id);
    try {
      const venteId = await convertirDevisEnVente(q.id, user.entrepriseId, user.id);
      router.push(`/sales/${venteId}`);
    } finally {
      setConverting(null);
    }
  };

  const generatePdf = async (q: Devis) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text('Devis', 14, 22);
    doc.setFontSize(12);
    doc.text(`Référence: ${q.reference}`, 14, 32);
    doc.text(`Date: ${q.createdAt ? new Date(q.createdAt).toLocaleDateString('fr-FR') : '-'}`, 14, 40);
    doc.text(`Client: ${q.clientNom ?? 'Non spécifié'}`, 14, 48);
    doc.text(`Montant: ${q.total.toLocaleString('fr-FR')} FCFA`, 14, 56);
    doc.text(`Statut: ${statutLabel[q.statut] ?? q.statut}`, 14, 64);
    doc.save(`Devis_${q.reference}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Tableau de bord / Devis</p>
            <CardTitle>Devis</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Info className="h-3 w-3" />Liste des devis enregistrés
            </CardDescription>
          </div>
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
            <Link href="/sales/quotes/new"><PlusCircle className="h-4 w-4 mr-2" />Nouveau Devis</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : quotes.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun devis enregistré.</TableCell></TableRow>
            ) : quotes.map((q) => (
              <TableRow key={q.id}>
                <TableCell>{q.createdAt ? new Date(q.createdAt).toLocaleDateString('fr-FR') : '-'}</TableCell>
                <TableCell className="font-medium">{q.reference}</TableCell>
                <TableCell>{q.dateEcheance ? new Date(q.dateEcheance).toLocaleDateString('fr-FR') : 'Non spécifiée'}</TableCell>
                <TableCell>{q.clientNom ?? 'Non spécifié'}</TableCell>
                <TableCell>{q.total.toLocaleString('fr-FR')} FCFA</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statutBadge[q.statut] ?? 'bg-gray-100 text-gray-800'}>
                    {statutLabel[q.statut] ?? q.statut}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(q.statut === 'brouillon' || q.statut === 'envoye') && (
                      <Button
                        onClick={() => handleConvertir(q)}
                        disabled={converting === q.id}
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 border-purple-500 text-purple-600 hover:bg-purple-50"
                        title="Convertir en vente"
                      >
                        {converting === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button onClick={() => generatePdf(q)} size="icon" variant="outline" className="h-8 w-8 border-blue-500 text-blue-500 hover:bg-blue-50" title="Imprimer">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDuplicate(q)} size="icon" variant="outline" className="h-8 w-8 border-green-500 text-green-600 hover:bg-green-50" title="Dupliquer">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDelete(q.id)} size="icon" variant="outline" className="h-8 w-8 border-red-400 text-red-500 hover:bg-red-50" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{quotes.length} devis</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Précédent</Button>
          <Button variant="default" size="sm" className="w-8 h-8 p-0">1</Button>
          <Button variant="outline" size="sm">Suivant</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
