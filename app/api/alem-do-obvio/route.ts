import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function reference() {
  return `AO-${randomBytes(3).toString('hex').toUpperCase().slice(0, 4)}`;
}

export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); } catch { return json({ error: 'Envie os dados do formulário em JSON.' }, 400); }
  if (!input || typeof input !== 'object') return json({ error: 'Dados inválidos.' }, 400);
  const data = input as Record<string, unknown>;
  const webhookUrl = process.env.FORM_WEBHOOK_URL;
  if (data.type === 'cta_click') {
    const ref = typeof data.reference === 'string' && data.reference ? data.reference : reference();
    const tracking = data.tracking && typeof data.tracking === 'object' ? data.tracking : {};
    const payload = { tipo_evento: 'clique_whatsapp', codigo_de_referencia: ref, cta: data.cta || 'cta', pagina: data.page || '', data_e_hora: new Date().toISOString(), rastreio: tracking, rastreio_texto: data.tracking_text || '', origem: 'alem_do_obvio' };
    if (!webhookUrl) return json({ ok: true, reference: ref, webhook: 'not_configured' });
    try {
      const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.FORM_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.FORM_WEBHOOK_TOKEN}` } : {}), 'X-Event-Key': 'alem_do_obvio_whatsapp_click', 'X-Reference': ref }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`webhook_${response.status}`);
      return json({ ok: true, reference: ref });
    } catch {
      console.error('alem_do_obvio_cta_webhook_failed');
      return json({ ok: false }, 503);
    }
  }
  if (!webhookUrl) return json({ error: 'O webhook ainda não foi configurado.' }, 503);
  const required = ['name', 'whatsapp', 'instagram', 'revenue', 'difficultyOne', 'difficultyTwo'];
  if (required.some(field => typeof data[field] !== 'string' || !String(data[field]).trim()) || data.consent !== true) return json({ error: 'Preencha todos os campos obrigatórios e aceite o contato pelo WhatsApp.' }, 422);

  const ref = reference();
  const tracking = data.tracking && typeof data.tracking === 'object' ? data.tracking : {};
  const payload = {
    nome_completo: String(data.name).trim(),
    whatsapp: String(data.whatsapp).trim(),
    instagram: String(data.instagram).trim(),
    faturamento_mensal: String(data.revenue),
    principal_dificuldade: String(data.difficultyOne),
    segunda_dificuldade: String(data.difficultyTwo),
    outra_dificuldade: typeof data.other === 'string' ? data.other.trim() : '',
    consentimento_whatsapp: true,
    codigo_de_referencia: ref,
    data_e_hora: new Date().toISOString(),
    rastreio: tracking,
    origem: 'alem_do_obvio',
  };
  try {
    const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.FORM_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.FORM_WEBHOOK_TOKEN}` } : {}), 'X-Event-Key': 'alem_do_obvio_lead', 'X-Reference': ref }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`webhook_${response.status}`);
    return json({ ok: true, reference: ref });
  } catch {
    console.error('alem_do_obvio_webhook_failed');
    return json({ error: 'Não conseguimos enviar seus dados agora. Tente novamente em instantes.' }, 503);
  }
}
