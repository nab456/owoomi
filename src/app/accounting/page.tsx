'use client';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listVentes } from '@/services/vente';
import { listDepenses } from '@/services/depense';
import { listEntrees } from '@/services/entree';
import type { Vente, Depense } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BookOpen, TrendingUp, Scale, FileDown } from 'lucide-react';

interface JournalEntry {
  date: string;
  libelle: string;
  compteDebit: string;
  compteCredit: string;
  debit: number;
  credit: number;
}

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function AccountingPage() {
  const { user } = useAuth();
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [entrees, setEntrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (!user?.entrepriseId) return;
    Promise.all([listVentes(), listDepenses(), listEntrees()]).then(([v, d, e]) => {
      setVentes(v); setDepenses(d); setEntrees(e); setLoading(false);
    });
  }, [user?.entrepriseId]);

  const selectedYear = parseInt(year);

  // Build journal from operations
  const journal = useMemo((): JournalEntry[] => {
    const entries: JournalEntry[] = [];

    ventes.forEach(v => {
      if (!v.createdAt || new Date(v.createdAt).getFullYear() !== selectedYear) return;
      const date = new Date(v.createdAt).toLocaleDateString('fr-FR');
      // Debit Client 411, Credit Ventes 701
      entries.push({ date, libelle: `Vente ${v.reference} — ${v.clientNom ?? 'Client général'}`, compteDebit: '411 Clients', compteCredit: '701 Ventes', debit: v.total, credit: 0 });
      // Payment received: Debit Caisse 512, Credit Client 411
      if (v.montantPaye > 0) {
        entries.push({ date, libelle: `Encaissement ${v.reference}`, compteDebit: '512 Caisse/Banque', compteCredit: '411 Clients', debit: v.montantPaye, credit: 0 });
      }
    });

    depenses.forEach(d => {
      if (!d.createdAt || new Date(d.createdAt).getFullYear() !== selectedYear) return;
      const date = new Date(d.createdAt).toLocaleDateString('fr-FR');
      entries.push({ date, libelle: `Dépense: ${d.categorie ?? 'Divers'} — ${d.description ?? ''}`, compteDebit: '614 Charges', compteCredit: '512 Caisse/Banque', debit: 0, credit: d.montant });
    });

    entrees.forEach((e: any) => {
      if (!e.createdAt || new Date(e.createdAt).getFullYear() !== selectedYear) return;
      const date = new Date(e.createdAt).toLocaleDateString('fr-FR');
      entries.push({ date, libelle: `Entrée: ${e.categorie ?? ''} — ${e.notes ?? ''}`, compteDebit: '512 Caisse/Banque', compteCredit: '706 Produits divers', debit: e.montant, credit: 0 });
    });

    return entries.sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());
  }, [ventes, depenses, entrees, selectedYear]);

  const totalDebits = journal.reduce((s, e) => s + e.debit, 0);
  const totalCredits = journal.reduce((s, e) => s + e.credit, 0);

  // Compte de résultat (P&L)
  const venteAnnee = ventes.filter(v => v.createdAt && new Date(v.createdAt).getFullYear() === selectedYear).reduce((s, v) => s + v.total, 0);
  const encaissementsAnnee = ventes.filter(v => v.createdAt && new Date(v.createdAt).getFullYear() === selectedYear).reduce((s, v) => s + v.montantPaye, 0);
  const entreesAnnee = entrees.filter((e: any) => e.createdAt && new Date(e.createdAt).getFullYear() === selectedYear).reduce((s: number, e: any) => s + e.montant, 0);
  const chargesAnnee = depenses.filter(d => d.createdAt && new Date(d.createdAt).getFullYear() === selectedYear).reduce((s, d) => s + d.montant, 0);
  const produitTotal = venteAnnee + entreesAnnee;
  const resultat = produitTotal - chargesAnnee;

  // Monthly P&L for Bilan-like view
  const monthlyPL = useMemo(() => MONTH_LABELS.map((label, m) => {
    const rev = ventes.filter(v => v.createdAt && new Date(v.createdAt).getMonth() === m && new Date(v.createdAt).getFullYear() === selectedYear).reduce((s, v) => s + v.total, 0);
    const exp = depenses.filter(d => d.createdAt && new Date(d.createdAt).getMonth() === m && new Date(d.createdAt).getFullYear() === selectedYear).reduce((s, d) => s + d.montant, 0);
    return { month: label, produits: rev, charges: exp, resultat: rev - exp };
  }), [ventes, depenses, selectedYear]);

  const years = Array.from(new Set([...ventes, ...depenses].map(x => x.createdAt ? new Date(x.createdAt).getFullYear() : null).filter(Boolean))).sort((a, b) => b! - a!);
  if (!years.includes(selectedYear)) years.unshift(selectedYear);

  const exportJournal = async () => {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet(journal.map(e => ({
      Date: e.date, Libellé: e.libelle, 'Compte Débit': e.compteDebit,
      'Compte Crédit': e.compteCredit, Débit: e.debit || '', Crédit: e.credit || '',
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Journal');
    writeFile(wb, `Journal_${year}.xlsx`);
  };

  if (loading) return <div className="text-center py-16 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" />Comptabilité</h1>
          <p className="text-muted-foreground">Journal, compte de résultat et bilan simplifié (OHADA)</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y!} value={y!.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={exportJournal}><FileDown className="h-4 w-4 mr-2" />Exporter journal</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Produits (CA)', value: venteAnnee, color: 'text-green-600' },
          { label: 'Autres entrées', value: entreesAnnee, color: 'text-blue-600' },
          { label: 'Charges', value: chargesAnnee, color: 'text-red-500' },
          { label: 'Résultat net', value: resultat, color: resultat >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value.toLocaleString('fr-FR')} F</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="journal">
        <TabsList>
          <TabsTrigger value="journal"><BookOpen className="h-4 w-4 mr-1" />Journal</TabsTrigger>
          <TabsTrigger value="resultat"><TrendingUp className="h-4 w-4 mr-1" />Compte de résultat</TabsTrigger>
          <TabsTrigger value="bilan"><Scale className="h-4 w-4 mr-1" />Bilan mensuel</TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Journal Comptable {year}</CardTitle><CardDescription>{journal.length} écritures générées automatiquement</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Compte Débit</TableHead>
                  <TableHead>Compte Crédit</TableHead>
                  <TableHead className="text-right">Débit</TableHead>
                  <TableHead className="text-right">Crédit</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {journal.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune écriture pour {year}.</TableCell></TableRow>
                  ) : journal.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{e.date}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{e.libelle}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.compteDebit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.compteCredit}</TableCell>
                      <TableCell className="text-right text-green-700">{e.debit > 0 ? e.debit.toLocaleString('fr-FR') : ''}</TableCell>
                      <TableCell className="text-right text-red-600">{e.credit > 0 ? e.credit.toLocaleString('fr-FR') : ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold">Totaux</TableCell>
                    <TableCell className="text-right font-bold text-green-700">{totalDebits.toLocaleString('fr-FR')}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">{totalCredits.toLocaleString('fr-FR')}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resultat" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Produits (Revenus)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>701 — Ventes de marchandises</TableCell><TableCell className="text-right font-medium text-green-700">{venteAnnee.toLocaleString('fr-FR')} F</TableCell></TableRow>
                    <TableRow><TableCell>706 — Produits divers</TableCell><TableCell className="text-right font-medium text-green-700">{entreesAnnee.toLocaleString('fr-FR')} F</TableCell></TableRow>
                  </TableBody>
                  <TableFooter><TableRow><TableCell className="font-bold">Total Produits</TableCell><TableCell className="text-right font-bold text-green-700">{produitTotal.toLocaleString('fr-FR')} F</TableCell></TableRow></TableFooter>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Charges</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>614 — Charges d'exploitation</TableCell><TableCell className="text-right font-medium text-red-600">{chargesAnnee.toLocaleString('fr-FR')} F</TableCell></TableRow>
                  </TableBody>
                  <TableFooter><TableRow><TableCell className="font-bold">Total Charges</TableCell><TableCell className="text-right font-bold text-red-600">{chargesAnnee.toLocaleString('fr-FR')} F</TableCell></TableRow></TableFooter>
                </Table>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4 border-2 border-green-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Résultat Net {year}</p>
                  <p className={`text-4xl font-bold ${resultat >= 0 ? 'text-green-600' : 'text-red-600'}`}>{resultat.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Taux de marge: {produitTotal > 0 ? ((resultat / produitTotal) * 100).toFixed(1) : '0'}%</p>
                  <p>Encaissements réels: {encaissementsAnnee.toLocaleString('fr-FR')} F</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bilan" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Performance mensuelle {year}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Mois</TableHead>
                  <TableHead className="text-right">Produits</TableHead>
                  <TableHead className="text-right">Charges</TableHead>
                  <TableHead className="text-right">Résultat</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {monthlyPL.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell>{m.month}</TableCell>
                      <TableCell className="text-right text-green-700">{m.produits > 0 ? m.produits.toLocaleString('fr-FR') : '-'}</TableCell>
                      <TableCell className="text-right text-red-600">{m.charges > 0 ? m.charges.toLocaleString('fr-FR') : '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${m.resultat >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.produits > 0 || m.charges > 0 ? m.resultat.toLocaleString('fr-FR') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">Total {year}</TableCell>
                    <TableCell className="text-right font-bold text-green-700">{produitTotal.toLocaleString('fr-FR')}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">{chargesAnnee.toLocaleString('fr-FR')}</TableCell>
                    <TableCell className={`text-right font-bold ${resultat >= 0 ? 'text-green-600' : 'text-red-600'}`}>{resultat.toLocaleString('fr-FR')}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
