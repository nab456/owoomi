'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listVentes } from '@/services/vente';
import type { Vente } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle, CardFooter,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';

const statutLabel: Record<string, string> = {
  paye: 'Payé', valide: 'Validé', en_attente: 'En attente', annule: 'Annulé',
};

const getStatusBadge = (statut: string) => {
  if (statut === 'paye') return 'bg-green-100 text-green-800 border-green-200';
  if (statut === 'valide') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (statut === 'en_attente') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (statut === 'annule') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-800';
};

const formatCurrency = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export default function ReportsPage() {
  const { user } = useAuth();
  const [allVentes, setAllVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredData, setFilteredData] = useState<Vente[]>([]);

  const [selectedVendeur, setSelectedVendeur] = useState('all');
  const [period, setPeriod] = useState('this-month');
  const [status, setStatus] = useState('all');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const data = await listVentes();
    setAllVentes(data);
    setFilteredData(data);
    setLoading(false);
  }

  const vendeurs = useMemo(() => {
    const names = [...new Set(allVentes.map(v => v.vendeurNom).filter(Boolean) as string[])];
    return names;
  }, [allVentes]);

  const handleGenerateReport = () => {
    let data = [...allVentes];
    if (selectedVendeur !== 'all') data = data.filter(v => v.vendeurNom === selectedVendeur);
    if (status !== 'all') data = data.filter(v => v.statut === status);

    const now = new Date();
    if (period === 'today') {
      data = data.filter(v => v.createdAt && new Date(v.createdAt).toDateString() === now.toDateString());
    } else if (period === 'this-week') {
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
      data = data.filter(v => v.createdAt && new Date(v.createdAt) >= weekStart);
    } else if (period === 'this-month') {
      data = data.filter(v => v.createdAt && new Date(v.createdAt).getMonth() === now.getMonth() && new Date(v.createdAt).getFullYear() === now.getFullYear());
    } else if (period === 'this-year') {
      data = data.filter(v => v.createdAt && new Date(v.createdAt).getFullYear() === now.getFullYear());
    }

    setFilteredData(data);
  };

  const totals = useMemo(() => filteredData.reduce((acc, v) => ({
    total: acc.total + v.total,
    paid: acc.paid + v.montantPaye,
    due: acc.due + (v.total - v.montantPaye),
  }), { total: 0, paid: 0, due: 0 }), [filteredData]);

  const generatePdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Rapport des Ventes', 14, 22);
    doc.setFontSize(10); doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);
    const columns = ['Référence', 'Date', 'Client', 'Vendeur', 'Total', 'Payé', 'Reste', 'Statut'];
    const rows = filteredData.map(v => [
      v.reference,
      v.createdAt ? new Date(v.createdAt).toLocaleDateString('fr-FR') : '-',
      v.clientNom ?? '-',
      v.vendeurNom ?? '-',
      formatCurrency(v.total),
      formatCurrency(v.montantPaye),
      formatCurrency(v.total - v.montantPaye),
      statutLabel[v.statut] ?? v.statut,
    ]);
    (doc as any).autoTable({
      head: [columns], body: rows, startY: 35, theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });
    doc.save('rapport-ventes.pdf');
  };

  const generateXlsx = () => {
    const data = filteredData.map(v => ({
      'Référence': v.reference,
      'Date': v.createdAt ? new Date(v.createdAt).toLocaleDateString('fr-FR') : '-',
      'Client': v.clientNom ?? '-',
      'Vendeur': v.vendeurNom ?? '-',
      'Montant Total (FCFA)': v.total,
      'Montant Payé (FCFA)': v.montantPaye,
      'Reste (FCFA)': v.total - v.montantPaye,
      'Statut': statutLabel[v.statut] ?? v.statut,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport des Ventes');
    XLSX.writeFile(wb, 'rapport-ventes.xlsx');
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Tableau de bord / Rapports</p>
        <h1 className="text-2xl font-bold">Gestion des Rapports</h1>
        <p className="text-muted-foreground">Aperçu sur les différents données de la plateforme</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="user">Vendeur</Label>
              <Select value={selectedVendeur} onValueChange={setSelectedVendeur}>
                <SelectTrigger id="user"><SelectValue placeholder="Tous les vendeurs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les vendeurs</SelectItem>
                  {vendeurs.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period">Période</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period"><SelectValue placeholder="Ce Mois" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="this-week">Cette semaine</SelectItem>
                  <SelectItem value="this-month">Ce mois-ci</SelectItem>
                  <SelectItem value="this-year">Cette année</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="paye">Payé</SelectItem>
                  <SelectItem value="valide">Validé</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-start gap-2">
          <Button onClick={handleGenerateReport}>Générer le Rapport</Button>
          <Button variant="outline" onClick={generateXlsx}>Exporter en Excel</Button>
          <Button variant="destructive" onClick={generatePdf}>
            <FileText className="h-4 w-4 mr-2" />Exporter en PDF
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rapport des Ventes <span className="text-sm font-normal text-muted-foreground">({filteredData.length} résultat(s))</span></CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Vendeur</TableHead>
                <TableHead>Montant Total</TableHead>
                <TableHead>Montant Payé</TableHead>
                <TableHead>Reste</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune vente.</TableCell></TableRow>
              ) : filteredData.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.reference}</TableCell>
                  <TableCell>{v.createdAt ? new Date(v.createdAt).toLocaleDateString('fr-FR') : '-'}</TableCell>
                  <TableCell>{v.clientNom ?? '-'}</TableCell>
                  <TableCell>{v.vendeurNom ?? '-'}</TableCell>
                  <TableCell>{formatCurrency(v.total)}</TableCell>
                  <TableCell>{formatCurrency(v.montantPaye)}</TableCell>
                  <TableCell>{formatCurrency(v.total - v.montantPaye)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadge(v.statut)}>{statutLabel[v.statut] ?? v.statut}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="font-bold text-right">Total</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.total)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.paid)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(totals.due)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
