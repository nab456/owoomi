'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listEntrees, createEntree } from '@/services/entree';
import { MODES_PAIEMENT } from '@/services/caisse';
import type { Entree } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle, CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Info } from 'lucide-react';

export default function IncomePage() {
  const { user } = useAuth();
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState('');
  const [categorie, setCategorie] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    setEntrees(await listEntrees());
    setLoading(false);
  }

  const handleSave = async () => {
    if (!montant || !modePaiement || !categorie || !user?.entrepriseId) return;
    setSaving(true);
    try {
      const created = await createEntree({
        date: new Date().toISOString().split('T')[0],
        montant: parseFloat(montant),
        categorie,
        modePaiement,
        notes: notes || undefined,
        userId: user.id,
        entrepriseId: user.entrepriseId,
      });
      setEntrees(prev => [created, ...prev]);
      setMontant(''); setModePaiement(''); setCategorie(''); setNotes('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tableau de bord / Entrées Financières</p>
        <h1 className="text-2xl font-bold">Entrées Financières</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1">
          <Info className="h-4 w-4" />Gestion des revenus et des ventes
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle Entrée Financière</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="e-montant">Montant (FCFA) *</Label>
                <Input id="e-montant" type="number" placeholder="0.00" value={montant} onChange={e => setMontant(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-mode">Mode de paiement *</Label>
                <Select value={modePaiement} onValueChange={setModePaiement}>
                  <SelectTrigger id="e-mode"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {MODES_PAIEMENT.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-categorie">Catégorie *</Label>
                <Input id="e-categorie" placeholder="Vente, Don, Remboursement..." value={categorie} onChange={e => setCategorie(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-notes">Notes (Facultatif)</Label>
                <Textarea id="e-notes" placeholder="Ajouter une note..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dernières Entrées Financières</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Mode Paiement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                  ) : entrees.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune entrée financière.</TableCell></TableRow>
                  ) : entrees.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.reference}</TableCell>
                      <TableCell>{e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '-'}</TableCell>
                      <TableCell>{e.montant.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell>{e.categorie}</TableCell>
                      <TableCell>{e.modePaiement}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
