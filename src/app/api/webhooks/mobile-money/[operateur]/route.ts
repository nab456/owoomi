import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest, { params }: { params: { operateur: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const operateur = decodeURIComponent(params.operateur);
  let payload: any;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Extract common fields from various operator formats
  const montant = payload.amount ?? payload.montant ?? payload.transaction?.amount ?? 0;
  const reference = payload.transaction_id ?? payload.reference ?? payload.transactionId ?? null;
  const telephone = payload.phone ?? payload.msisdn ?? payload.sender ?? null;
  const statut = (payload.status === 'SUCCESS' || payload.status === 'SUCCESSFUL' || payload.status === 'success')
    ? 'confirme' : (payload.status === 'FAILED' || payload.status === 'failed') ? 'echec' : 'en_attente';

  // Look up which entreprise this webhook is for via config table
  const { data: config } = await supabase
    .from('mobile_money_config')
    .select('entreprise_id, webhook_secret')
    .eq('operateur', operateur)
    .eq('actif', true)
    .limit(1)
    .single();

  if (!config) {
    return NextResponse.json({ error: 'Operator not configured' }, { status: 404 });
  }

  // Insert transaction
  await supabase.from('mobile_money_transactions').insert({
    entreprise_id: config.entreprise_id,
    operateur,
    reference_externe: reference,
    telephone,
    montant: parseFloat(montant) || 0,
    statut,
    raw_payload: payload,
    confirmed_at: statut === 'confirme' ? new Date().toISOString() : null,
  });

  return NextResponse.json({ received: true });
}
