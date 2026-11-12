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
  const text = (key: string, max = 200) => (typeof data[key] === 'string' ? String(data[key]).trim().slice(0, max) : '');
  const required = ['name', 'whatsapp', 'email', 'city', 'profession', 'experience', 'fullFace', 'difficulty', 'attended'];
  if (required.some(field => !text(field)) || data.consent !== true) return json({ error: 'Preencha todos os campos obrigatórios e aceite o contato pelo WhatsApp.' }, 422);
  const phone = text('whatsapp', 30).replace(/\D/g, '');
  if (phone.length < 10 || phone.length > 15) return json({ error: 'Informe um WhatsApp válido, com DDD.' }, 422);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text('email'))) return json({ error: 'Informe um e-mail válido.' }, 422);

  const ref = typeof data.reference === 'string' && /^AO-[0-9A-F]{4}$/.test(data.reference) ? data.reference : reference();
  const tracking = data.tracking && typeof data.tracking === 'object' ? data.tracking : {};
  const payload = {
    nome_completo: text('name'),
    whatsapp: phone,
    email: text('email'),
    cidade: text('city'),
    profissao: text('profession'),
    tempo_de_atuacao: text('experience'),
    faz_harmonizacao_facial: text('fullFace'),
    maior_dificuldade: text('difficulty'),
    ja_fez_curso_com_dr_ritchie: text('attended'),
    instagram: text('instagram'),
    registro_profissional: text('registry'),
    consentimento_whatsapp: true,
    cta: text('cta', 60),
    pagina: text('page', 500),
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
