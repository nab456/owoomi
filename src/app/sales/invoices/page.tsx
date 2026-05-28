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
import { Info, PlusCircle, Printer, FileText } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { listVentes } from '@/services/vente';
import type { Vente } from '@/types';

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.entrepriseId) load();
  }, [user]);

  async function load() {
    setLoading(true);
    const all = await listVentes();
    setInvoices(all.filter(v => v.type === 'ticket'));
    setLoading(false);
  }

  const getStatusBadge = (statut: string) =>
    statut === 'paye' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800';

  const generatePdf = async (v: Vente) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text('Facture Ticket', 14, 22);
    doc.setFontSize(12);
    doc.text(`Référence: ${v.reference}`, 14, 32);
    doc.text(`Date: ${v.createdAt ? new Date(v.createdAt).toLocaleString('fr-FR') : '-'}`, 14, 40);
    doc.text(`Client: ${v.clientNom ?? 'Non spécifié'}`, 14, 48);
    doc.text(`Montant: ${v.total.toLocaleString('fr-FR')} FCFA`, 14, 56);
    doc.text(`Statut: ${v.statut}`, 14, 64);
    doc.save(`Facture_${v.reference}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Tableau de bord / Factures</p>
            <CardTitle>Factures Tickets</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Info className="h-3 w-3" />Liste des factures au format ticket
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
              <Link href="/sales/new"><PlusCircle className="h-4 w-4 mr-2" />Nouvelle Vente</Link>
            </Button>
            <Button variant="outline"><FileText className="h-4 w-4 mr-2" />Factures A4</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Vendeur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <div>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('fr-FR') : '-'}</div>
                  <div className="text-xs text-muted-foreground">{inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                </TableCell>
                <TableCell className="font-medium">{inv.reference}</TableCell>
                <TableCell>{inv.clientNom ?? 'Non spécifié'}</TableCell>
                <TableCell>{inv.total.toLocaleString('fr-FR')} FCFA</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusBadge(inv.statut)}>
                    {inv.statut === 'paye' ? 'Payé' : inv.statut}
                  </Badge>
                </TableCell>
                <TableCell>{inv.vendeurNom ?? '-'}</TableCell>
                <TableCell className="text-right">
                  <Button onClick={() => generatePdf(inv)} size="icon" variant="outline" className="h-8 w-8 rounded-full border-blue-500 text-blue-500 hover:bg-blue-50">
                    <Printer className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {invoices.length} facture(s)
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Précédent</Button>
          <Button variant="default" size="sm" className="w-8 h-8 p-0">1</Button>
          <Button variant="outline" size="sm">Suivant</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
