'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Smartphone, Copy, CheckCircle, Clock, XCircle, Settings, RefreshCw } from 'lucide-react';

const OPERATEURS = ['MTN Mobile Money', 'Moov Money', 'Wave', 'Orange Money', 'Airtel Money'];

interface MMConfig {
  id?: string;
  operateur: string;
  numeroMarchand: string;
  apiKey: string;
  webhookSecret: string;
  actif: boolean;
}

interface MMTransaction {
  id: string;
  operateur: string;
  referenceExterne?: string;
  telephone?: string;
  montant: number;
  statut: 'en_attente' | 'confirme' | 'echec';
  createdAt?: string;
  confirmedAt?: string;
  venteId?: string;
}

export default function MobileMoneyPage() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<Record<string, MMConfig>>({});
  const [transactions, setTransactions] = useState<MMTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<string>('');
  const [formData, setFormData] = useState({ numeroMarchand: '', apiKey: '', webhookSecret: '', actif: false });
  const [copiedWebhook, setCopiedWebhook] = useState('');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: cfgs }, { data: txs }] = await Promise.all([
      supabase.from('mobile_money_config').select('*').eq('entreprise_id', user!.entrepriseId!),
      supabase.from('mobile_money_transactions').select('*').eq('entreprise_id', user!.entrepriseId!).order('created_at', { ascending: false }).limit(50),
    ]);

    const cfgMap: Record<string, MMConfig> = {};
    OPERATEURS.forEach(op => {
      const row = (cfgs ?? []).find((r: any) => r.operateur === op);
      cfgMap[op] = { id: row?.id, operateur: op, numeroMarchand: row?.numero_marchand ?? '', apiKey: row?.api_key ?? '', webhookSecret: row?.webhook_secret ?? '', actif: row?.actif ?? false };
    });
    setConfigs(cfgMap);

    setTransactions((txs ?? []).map((r: any) => ({
      id: r.id, operateur: r.operateur, referenceExterne: r.reference_externe,
      telephone: r.telephone, montant: r.montant, statut: r.statut,
      createdAt: r.created_at, confirmedAt: r.confirmed_at, venteId: r.vente_id,
    })));
    setLoading(false);
  }

  const openConfigDialog = (op: string) => {
    setEditingOp(op);
    const cfg = configs[op];
    setFormData({ numeroMarchand: cfg.numeroMarchand, apiKey: cfg.apiKey, webhookSecret: cfg.webhookSecret, actif: cfg.actif });
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!user?.entrepriseId) return;
    setSaving(true);
    await supabase.from('mobile_money_config').upsert({
      entreprise_id: user.entrepriseId,
      operateur: editingOp,
      numero_marchand: formData.numeroMarchand || null,
      api_key: formData.apiKey || null,
      webhook_secret: formData.webhookSecret || null,
      actif: formData.actif,
    }, { onConflict: 'entreprise_id,operateur' });
    setConfigDialogOpen(false);
    load();
    setSaving(false);
  };

  const toggleActif = async (op: string, val: boolean) => {
    if (!user?.entrepriseId) return;
    await supabase.from('mobile_money_config').upsert({ entreprise_id: user.entrepriseId, operateur: op, actif: val }, { onConflict: 'entreprise_id,operateur' });
    setConfigs(prev => ({ ...prev, [op]: { ...prev[op], actif: val } }));
  };

  const webhookUrl = (op: string) => `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/mobile-money/${encodeURIComponent(op)}`;

  const copyWebhook = (op: string) => {
    navigator.clipboard.writeText(webhookUrl(op));
    setCopiedWebhook(op);
    setTimeout(() => setCopiedWebhook(''), 2000);
  };

  const statutIcon = (s: string) => {
    if (s === 'confirme') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === 'echec') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const statutBadge: Record<string, string> = { confirme: 'bg-green-100 text-green-800', echec: 'bg-red-100 text-red-800', en_attente: 'bg-yellow-100 text-yellow-800' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Smartphone className="h-6 w-6" />Mobile Money</h1>
        <p className="text-muted-foreground">Configurez vos intégrations Mobile Money et suivez les transactions</p>
      </div>

      {/* Operators config */}
      <Card>
        <CardHeader><CardTitle>Opérateurs configurés</CardTitle><CardDescription>Activez et configurez vos comptes marchands</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {OPERATEURS.map(op => {
            const cfg = configs[op] ?? { actif: false };
            return (
              <div key={op} className="flex items-center justify-between p-4 border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">{op.substring(0, 3).toUpperCase()}</div>
                  <div>
                    <p className="font-medium">{op}</p>
                    {cfg.numeroMarchand && <p className="text-xs text-muted-foreground">Nº {cfg.numeroMarchand}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cfg.actif ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500'}>
                    {cfg.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                  <Switch checked={cfg.actif} onCheckedChange={v => toggleActif(op, v)} />
                  <Button variant="outline" size="sm" onClick={() => openConfigDialog(op)}>
                    <Settings className="h-4 w-4 mr-1" />Configurer
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => copyWebhook(op)} title="Copier l'URL webhook">
                    {copiedWebhook === op ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transactions Mobile Money</CardTitle>
            <CardDescription>Historique des paiements reçus via Mobile Money</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Opérateur</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              : transactions.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune transaction Mobile Money enregistrée.</TableCell></TableRow>
              : transactions.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.createdAt ? new Date(t.createdAt).toLocaleString('fr-FR') : '-'}</TableCell>
                  <TableCell>{t.operateur}</TableCell>
                  <TableCell>{t.telephone ?? '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{t.referenceExterne ?? '-'}</TableCell>
                  <TableCell className="text-right font-medium">{t.montant.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {statutIcon(t.statut)}
                      <Badge variant="outline" className={statutBadge[t.statut]}>{t.statut}</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Webhook info box */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-blue-800 mb-2">Comment configurer les webhooks</p>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Copiez l'URL webhook de l'opérateur (bouton <Copy className="h-3 w-3 inline" />)</li>
            <li>Configurez-la dans le portail développeur de l'opérateur (MTN, Moov, Wave...)</li>
            <li>L'application recevra automatiquement les confirmations de paiement</li>
            <li>Les transactions apparaîtront ici avec leur statut en temps réel</li>
          </ol>
        </CardContent>
      </Card>

      {/* Config dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configurer {editingOp}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Numéro marchand</Label><Input placeholder="Ex: +22500000000" value={formData.numeroMarchand} onChange={e => setFormData(p => ({ ...p, numeroMarchand: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Clé API</Label><Input type="password" placeholder="Clé API fournie par l'opérateur" value={formData.apiKey} onChange={e => setFormData(p => ({ ...p, apiKey: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Secret webhook</Label><Input type="password" placeholder="Secret pour vérifier les webhooks" value={formData.webhookSecret} onChange={e => setFormData(p => ({ ...p, webhookSecret: e.target.value }))} /></div>
            <div className="flex items-center gap-3 pt-2"><Switch checked={formData.actif} onCheckedChange={v => setFormData(p => ({ ...p, actif: v }))} /><Label>Activer cette intégration</Label></div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">URL Webhook à configurer chez l'opérateur:</p>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl(editingOp)} className="text-xs font-mono" />
                <Button variant="outline" size="sm" onClick={() => copyWebhook(editingOp)}>
                  {copiedWebhook === editingOp ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleSaveConfig} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
