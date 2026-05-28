'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface AppNotification {
  id: string;
  type: 'stock_rupture' | 'stock_faible' | 'facture_impayee' | 'devis_expire';
  title: string;
  message: string;
  href: string;
  severity: 'error' | 'warning' | 'info';
  createdAt: Date;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.entrepriseId) return;
    let cancelled = false;

    async function compute() {
      setLoading(true);
      const [
        { data: produits },
        { data: ventesImpayees },
        { data: devisExpires },
      ] = await Promise.all([
        supabase.from('produits').select('id, nom, stock, stock_minimum').eq('entreprise_id', user!.entrepriseId!),
        supabase.from('ventes').select('id, reference, client_nom, total, montant_paye, created_at')
          .eq('entreprise_id', user!.entrepriseId!)
          .in('statut', ['en_attente', 'valide']),
        supabase.from('devis').select('id, reference, client_nom, date_echeance')
          .eq('entreprise_id', user!.entrepriseId!)
          .eq('statut', 'envoye')
          .lt('date_echeance', new Date().toISOString()),
      ]);

      if (cancelled) return;

      const notifs: AppNotification[] = [];
      const now = new Date();

      // Rupture de stock
      (produits ?? []).filter(p => p.stock <= 0).forEach(p => {
        notifs.push({
          id: `rupture-${p.id}`,
          type: 'stock_rupture',
          title: 'Rupture de stock',
          message: `"${p.nom}" est en rupture de stock.`,
          href: '/products',
          severity: 'error',
          createdAt: now,
        });
      });

      // Stock faible
      (produits ?? []).filter(p => p.stock > 0 && p.stock <= p.stock_minimum).forEach(p => {
        notifs.push({
          id: `faible-${p.id}`,
          type: 'stock_faible',
          title: 'Stock faible',
          message: `"${p.nom}" — stock: ${p.stock} (min: ${p.stock_minimum}).`,
          href: '/products/stock-levels',
          severity: 'warning',
          createdAt: now,
        });
      });

      // Factures impayées > 7 jours
      (ventesImpayees ?? []).filter(v => {
        if (!v.created_at) return false;
        const age = (now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return age > 7;
      }).forEach(v => {
        const restant = v.total - v.montant_paye;
        notifs.push({
          id: `impayee-${v.id}`,
          type: 'facture_impayee',
          title: 'Facture impayée',
          message: `${v.reference} — ${v.client_nom ?? 'Client général'} : ${restant.toLocaleString('fr-FR')} FCFA restants.`,
          href: `/sales/${v.id}`,
          severity: 'warning',
          createdAt: new Date(v.created_at!),
        });
      });

      // Devis expirés
      (devisExpires ?? []).forEach(d => {
        notifs.push({
          id: `expire-${d.id}`,
          type: 'devis_expire',
          title: 'Devis expiré',
          message: `${d.reference} — ${d.client_nom ?? ''} a dépassé sa date d'échéance.`,
          href: '/sales/quotes',
          severity: 'info',
          createdAt: d.date_echeance ? new Date(d.date_echeance) : now,
        });
      });

      // Sort: errors first, then warnings, then info
      notifs.sort((a, b) => {
        const order = { error: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      });

      setNotifications(notifs);
      setLoading(false);
    }

    compute();
    // Refresh every 5 minutes
    const interval = setInterval(compute, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.entrepriseId]);

  return { notifications, loading, count: notifications.length };
}
