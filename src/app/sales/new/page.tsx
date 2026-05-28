'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { listClients } from '@/services/client';
import { listProduits } from '@/services/produit';
import { createVente } from '@/services/vente';
import { MODES_PAIEMENT } from '@/services/caisse';
import type { Client, Produit } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { ArrowLeft, User, ShoppingCart, Wallet, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface CartItem {
  produitId?: string;
  nomProduit: string;
  prixUnitaire: number;
  quantite: number;
  remise: number;
  total: number;
}

export default function NewSalePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState('');
  const [docType, setDocType] = useState<'ticket' | 'facture'>('facture');
  const [printAfter, setPrintAfter] = useState(true);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);

  const [selectedProduitId, setSelectedProduitId] = useState('');
  const [qteInput, setQteInput] = useState('1');

  const [paymentStatus, setPaymentStatus] = useState<'paye' | 'partiel' | 'non_paye'>('paye');
  const [paymentMode, setPaymentMode] = useState(MODES_PAIEMENT[0]);
  const [montantPaye, setMontantPaye] = useState('');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [c, p] = await Promise.all([listClients(), listProduits()]);
    setClients(c);
    setProduits(p);
    setLoading(false);
  }

  const total = items.reduce((s, i) => s + i.total, 0);

  const handleAddItem = () => {
    const produit = produits.find(p => p.id === selectedProduitId);
    if (!produit) return;
    const qte = parseFloat(qteInput) || 1;
    const existing = items.findIndex(i => i.produitId === produit.id);
    if (existing >= 0) {
      setItems(prev => prev.map((item, idx) => idx === existing
        ? { ...item, quantite: item.quantite + qte, total: (item.quantite + qte) * item.prixUnitaire }
        : item
      ));
    } else {
      setItems(prev => [...prev, {
        produitId: produit.id,
        nomProduit: produit.nom,
        prixUnitaire: produit.prix,
        quantite: qte,
        remise: 0,
        total: qte * produit.prix,
      }]);
    }
    setSelectedProduitId('');
    setQteInput('1');
  };

  const handleRemoveItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQtyChange = (idx: number, qte: number) => {
    setItems(prev => prev.map((item, i) => i === idx
      ? { ...item, quantite: qte, total: qte * item.prixUnitaire }
      : item
    ));
  };

  const computedMontantPaye = () => {
    if (paymentStatus === 'paye') return total;
    if (paymentStatus === 'non_paye') return 0;
    return parseFloat(montantPaye) || 0;
  };

  const handleSubmit = async () => {
    if (items.length === 0 || !user?.entrepriseId) return;
    setSaving(true);
    try {
      const paye = computedMontantPaye();
      const statut = paye >= total ? 'paye' : paye > 0 ? 'valide' : 'en_attente';
      const paiements = paye > 0 ? [{ venteId: '', montant: paye, mode: paymentMode }] : [];

      await createVente({
        type: docType,
        clientId: clientId || undefined,
        vendeurId: user.id,
        statut,
        items: items.map(i => ({
          produitId: i.produitId,
          nomProduit: i.nomProduit,
          quantite: i.quantite,
          prixUnitaire: i.prixUnitaire,
          remise: i.remise,
          total: i.total,
        })),
        paiements,
        notes: notes || undefined,
        entrepriseId: user.entrepriseId,
      });

      router.push('/sales');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nouvelle Vente</h1>
          <p className="text-muted-foreground">Créez une facture, bon de livraison ou ticket de caisse</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/sales"><ArrowLeft className="mr-2 h-4 w-4" />Retour aux ventes</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />Informations Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger id="client"><SelectValue placeholder="Client général" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Client général</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-type">Type de document *</Label>
                <Select value={docType} onValueChange={(v: 'ticket' | 'facture') => setDocType(v)}>
                  <SelectTrigger id="doc-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facture">Facture (A4)</SelectItem>
                    <SelectItem value="ticket">Ticket de caisse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="print-invoice" checked={printAfter} onCheckedChange={v => setPrintAfter(!!v)} />
                <Label htmlFor="print-invoice" className="font-normal text-sm">Imprimer après création</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />Articles en vente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="w-[100px] text-center">Quantité</TableHead>
                      <TableHead className="w-[130px] text-right">Prix Unit.</TableHead>
                      <TableHead className="w-[130px] text-right">Total</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          -- Sélectionner un produit --
                        </TableCell>
                      </TableRow>
                    ) : items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.nomProduit}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={item.quantite}
                            min={1}
                            className="w-16 text-center mx-auto"
                            onChange={e => handleQtyChange(idx, parseFloat(e.target.value) || 1)}
                          />
                        </TableCell>
                        <TableCell className="text-right">{item.prixUnitaire.toLocaleString('fr-FR')} FCFA</TableCell>
                        <TableCell className="text-right">{item.total.toLocaleString('fr-FR')} FCFA</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleRemoveItem(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold text-base">Total</TableCell>
                      <TableCell className="text-right font-bold text-base">{total.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-5 items-end">
                <div className="md:col-span-3 space-y-2">
                  <Label>Produit</Label>
                  <Select value={selectedProduitId} onValueChange={setSelectedProduitId}>
                    <SelectTrigger><SelectValue placeholder="-- Sélectionner un produit --" /></SelectTrigger>
                    <SelectContent>
                      {produits.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nom} — {p.prix.toLocaleString('fr-FR')} FCFA (stock: {p.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1 space-y-2">
                  <Label>Qté</Label>
                  <Input type="number" min={1} value={qteInput} onChange={e => setQteInput(e.target.value)} />
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleAddItem} disabled={!selectedProduitId}>
                  <Plus className="mr-2 h-4 w-4" />Ajouter
                </Button>
              </div>

              <div className="mt-6 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Ajouter des notes ici..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Wallet className="h-5 w-5" />Paiement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-status">Statut de paiement *</Label>
                    <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
                      <SelectTrigger id="payment-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paye">Payé en totalité</SelectItem>
                        <SelectItem value="partiel">Paiement partiel</SelectItem>
                        <SelectItem value="non_paye">Non payé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Méthode de paiement *</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger id="payment-method"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MODES_PAIEMENT.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentStatus === 'partiel' && (
                    <div className="space-y-2">
                      <Label htmlFor="amount-paid">Montant payé (FCFA)</Label>
                      <Input id="amount-paid" type="number" placeholder="0" value={montantPaye} onChange={e => setMontantPaye(e.target.value)} />
                    </div>
                  )}
                </div>
                {paymentStatus !== 'non_paye' && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Montant à encaisser: <strong>{computedMontantPaye().toLocaleString('fr-FR')} FCFA</strong>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild><Link href="/sales">Annuler</Link></Button>
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={handleSubmit}
          disabled={saving || items.length === 0}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
