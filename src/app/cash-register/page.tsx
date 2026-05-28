'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listTransactions, getSoldesParMode, createTransfert, MODES_PAIEMENT } from '@/services/caisse';
import type { TransactionCaisse } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Landmark, Smartphone, ArrowRightLeft, Info } from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const modeIcon = (mode: string) => {
  if (mode.toLowerCase().includes('virement')) return Landmark;
  if (mode === 'Espèces') return Wallet;
  return Smartphone;
};

const modeBadge = (mode: string) => {
  if (mode === 'Espèces') return 'bg-green-100 text-green-800';
  if (mode.toLowerCase().includes('virement')) return 'bg-orange-100 text-orange-800';
  return 'bg-purple-100 text-purple-800';
};

const formatCurrency = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export default function CashRegisterPage() {
  const { user } = useAuth();
  const [soldes, setSoldes] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<TransactionCaisse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [s, t] = await Promise.all([
      getSoldesParMode(user!.entrepriseId!),
      listTransactions(),
    ]);
    setSoldes(s);
    setTransactions(t);
    setLoading(false);
  }

  const soldeTotal = Object.values(soldes).reduce((a, b) => a + b, 0);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (!fromAccount || !toAccount || !amount || amount <= 0 || fromAccount === toAccount || !user?.entrepriseId) return;
    await createTransfert({
      modeSource: fromAccount,
      modeDestination: toAccount,
      montant: amount,
      description: transferNotes || undefined,
      userId: user.id,
      entrepriseId: user.entrepriseId,
    });
    setIsTransferDialogOpen(false);
    setFromAccount(''); setToAccount(''); setTransferAmount(''); setTransferNotes('');
    await load();
  };

  const getTypeRowClass = (type: string) =>
    type === 'entree' ? 'bg-green-100/30 hover:bg-green-100/50' : 'bg-red-100/30 hover:bg-red-100/50';

  const getTypeBadgeClass = (type: string) =>
    type === 'entree' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  const typeLabel = (type: string) => {
    if (type === 'entree') return 'Entrée';
    if (type === 'sortie') return 'Sortie';
    return 'Transfert';
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tableau de bord / Caisse</p>
        <h1 className="text-2xl font-bold mt-1">Gestion de Caisse</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1">
          <Info className="h-4 w-4" />Aperçu des soldes et des flux financiers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">SOLDE TOTAL</CardTitle>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${soldeTotal < 0 ? 'text-destructive' : ''}`}>{formatCurrency(soldeTotal)}</div>
            <Badge variant="outline" className="mt-2 font-normal bg-blue-100 text-blue-800 border-none">Total Caisse</Badge>
          </CardContent>
        </Card>
        {MODES_PAIEMENT.map(mode => {
          const Icon = modeIcon(mode);
          const solde = soldes[mode] ?? 0;
          return (
            <Card key={mode}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium uppercase">{mode}</CardTitle>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${solde < 0 ? 'text-destructive' : ''}`}>{formatCurrency(solde)}</div>
                <Badge variant="outline" className={`mt-2 font-normal ${modeBadge(mode)} border-none`}>
                  {mode === 'Espèces' ? 'Espèces' : mode.toLowerCase().includes('virement') ? 'Virement' : 'Mobile Money'}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Dernières transactions</CardTitle>
          </div>
          <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <ArrowRightLeft className="h-4 w-4 mr-2" />Transfert entre comptes
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleTransfer}>
                <DialogHeader>
                  <DialogTitle>Transfert entre comptes</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="from-account">Depuis le compte</Label>
                    <Select value={fromAccount} onValueChange={setFromAccount}>
                      <SelectTrigger id="from-account"><SelectValue placeholder="-- Sélectionner --" /></SelectTrigger>
                      <SelectContent>
                        {MODES_PAIEMENT.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to-account">Vers le compte</Label>
                    <Select value={toAccount} onValueChange={setToAccount}>
                      <SelectTrigger id="to-account"><SelectValue placeholder="-- Sélectionner --" /></SelectTrigger>
                      <SelectContent>
                        {MODES_PAIEMENT.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="t-amount">Montant (FCFA)</Label>
                    <Input id="t-amount" type="number" placeholder="0" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="t-notes">Note (optionnel)</Label>
                    <Textarea id="t-notes" placeholder="Ajouter une note..." value={transferNotes} onChange={e => setTransferNotes(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Annuler</Button>
                  </DialogClose>
                  <Button type="submit">Effectuer le transfert</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : transactions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune transaction.</TableCell></TableRow>
              ) : transactions.map(t => (
                <TableRow key={t.id} className={getTypeRowClass(t.type)}>
                  <TableCell>{t.createdAt ? new Date(t.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${getTypeBadgeClass(t.type)} border-none`}>{typeLabel(t.type)}</Badge>
                  </TableCell>
                  <TableCell className={`font-medium ${t.type === 'entree' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'entree' ? '+' : '-'}{formatCurrency(t.montant)}
                  </TableCell>
                  <TableCell>{t.modeSource}{t.modeDestination ? ` → ${t.modeDestination}` : ''}</TableCell>
                  <TableCell>{t.description ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
