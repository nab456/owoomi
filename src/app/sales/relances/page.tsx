'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Bell, RefreshCw, Mail, EyeOff, Copy, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listRelances, generateRelances, markRelanceEnvoyee, ignoreRelance, buildEmailContent,
  type Relance,
} from '@/services/relance';

const niveauColor: Record<number, string> = {
  7: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  15: 'bg-orange-100 text-orange-800 border-orange-200',
  30: 'bg-red-100 text-red-800 border-red-200',
};

const statutColor: Record<string, string> = {
  planifie: 'bg-blue-100 text-blue-800 border-blue-200',
  envoye: 'bg-green-100 text-green-800 border-green-200',
  ignore: 'bg-gray-100 text-gray-600',
};

export default function RelancesPage() {
  const { user } = useAuth();
  const [relances, setRelances] = useState<Relance[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [emailDialog, setEmailDialog] = useState<Relance | null>(null);
  const [emailText, setEmailText] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('planifie');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    setRelances(await listRelances(user!.entrepriseId!));
    setLoading(false);
  }

  async function handleGenerate() {
    if (!user?.entrepriseId) return;
    setGenerating(true);
    await generateRelances(user.entrepriseId);
    await load();
    setGenerating(false);
  }

  function openEmail(r: Relance) {
    setEmailDialog(r);
    setEmailText(buildEmailContent(r, user?.nom ?? 'Votre entreprise'));
    setCopied(false);
  }

  async function handleMarkSent(r: Relance) {
    await markRelanceEnvoyee(r.id);
    setEmailDialog(null);
    load();
  }

  async function handleIgnore(id: string) {
    await ignoreRelance(id);
    load();
  }

  function copyEmail() {
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const byStatut = (s: string) => relances.filter(r => r.statut === s);

  const RelanceTable = ({ rows }: { rows: Relance[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Facture</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Montant</TableHead>
          <TableHead>Niveau</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
        ) : rows.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune relance.</TableCell></TableRow>
        ) : rows.map(r => (
          <TableRow key={r.id}>
            <TableCell className="font-medium font-mono text-sm">{r.venteReference ?? r.venteId.slice(0, 8)}</TableCell>
            <TableCell>{r.clientNom ?? '-'}</TableCell>
            <TableCell>{(r.venteMontant ?? 0).toLocaleString('fr-FR')} FCFA</TableCell>
            <TableCell>
              <Badge variant="outline" className={niveauColor[r.niveau]}>J+{r.niveau}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={statutColor[r.statut]}>
                {r.statut === 'planifie' ? 'À envoyer' : r.statut === 'envoye' ? 'Envoyée' : 'Ignorée'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                {r.statut === 'planifie' && (
                  <>
                    <Button onClick={() => openEmail(r)} size="icon" variant="outline" className="h-8 w-8 border-blue-500 text-blue-600 hover:bg-blue-50" title="Préparer l'email">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleIgnore(r.id)} size="icon" variant="outline" className="h-8 w-8 border-gray-300 text-gray-500 hover:bg-gray-50" title="Ignorer">
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {r.statut === 'envoye' && r.sentAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.sentAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Ventes / Relances</p>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" />Relances Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">Pipeline automatique J+7, J+15, J+30 pour les factures impayées</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="bg-green-600 hover:bg-green-700 text-white">
          {generating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Générer les relances
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'À envoyer', count: byStatut('planifie').length, color: 'text-blue-600' },
          { label: 'Envoyées', count: byStatut('envoye').length, color: 'text-green-600' },
          { label: 'Ignorées', count: byStatut('ignore').length, color: 'text-gray-500' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relances</CardTitle>
          <CardDescription>Cliquez sur "Générer les relances" pour détecter les factures impayées et créer les relances correspondantes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="planifie">À envoyer ({byStatut('planifie').length})</TabsTrigger>
              <TabsTrigger value="envoye">Envoyées ({byStatut('envoye').length})</TabsTrigger>
              <TabsTrigger value="ignore">Ignorées ({byStatut('ignore').length})</TabsTrigger>
            </TabsList>
            <TabsContent value="planifie"><RelanceTable rows={byStatut('planifie')} /></TabsContent>
            <TabsContent value="envoye"><RelanceTable rows={byStatut('envoye')} /></TabsContent>
            <TabsContent value="ignore"><RelanceTable rows={byStatut('ignore')} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Email preview dialog */}
      <Dialog open={!!emailDialog} onOpenChange={open => { if (!open) setEmailDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Email de relance J+{emailDialog?.niveau} — {emailDialog?.clientNom ?? 'Client'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {emailDialog?.emailDestinataire && (
              <p className="text-sm text-muted-foreground">À: <span className="font-medium text-foreground">{emailDialog.emailDestinataire}</span></p>
            )}
            <Textarea
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter className="gap-2 flex-row">
            <Button variant="outline" onClick={copyEmail} className="flex-1">
              {copied ? <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copié !' : 'Copier'}
            </Button>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              onClick={() => emailDialog && handleMarkSent(emailDialog)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Marquer comme envoyée
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
