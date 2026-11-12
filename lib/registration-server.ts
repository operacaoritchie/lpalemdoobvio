import { EVENT_KEY, GROUP_URL, NOTICE_VERSION, submissionSchema, validatePhone, validateValues } from './questionnaire';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

type RegistrationConfig = { webhookUrl?: string; webhookToken?: string };

export type RegistrationRecord = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  instagram: string;
  location: string;
  experience: string;
  stage: string;
  revenue: string;
  challenges: string[];
  challengeOther: string;
  focusArea: string;
  sixMonths: string;
  targetRevenue: string;
  expectation: string;
  expectationOther: string;
  need: string;
  mentoring: string;
  openness: string;
};

export type RegistrationStore = (input: {
  submissionId: string;
  eventKey: string;
  record: RegistrationRecord;
  answers: string;
  hash: string;
  noticeVersion: string;
  createdAt: string;
}) => Promise<string | undefined>;

export async function handleRegistration(
  request: Request,
  saveRegistration: RegistrationStore,
  getConfig: () => RegistrationConfig = () => ({}),
) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Origem da solicitação inválida.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Envie os dados do formulário.' }, 415);
  if (Number(request.headers.get('content-length')) > 24000) return json({ error: 'As respostas excederam o tamanho permitido.' }, 413);

  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 24000) return json({ error: 'As respostas excederam o tamanho permitido.' }, 413);
    input = JSON.parse(raw);
  } catch {
    return json({ error: 'Não foi possível ler as respostas. Tente novamente.' }, 400);
  }

  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'form')] ??= issue.message;
    return json({ error: 'Confira os campos indicados antes de enviar.', fields }, 422);
  }

  const values = parsed.data;
  const errors = validateValues(values);
  if (Object.keys(errors).length) return json({ error: 'Confira os campos indicados antes de enviar.', fields: errors }, 422);

  const phone = validatePhone(values.phone, values.country)!;
  const record: RegistrationRecord = {
    fullName: values.fullName,
    email: values.email.toLowerCase(),
    phone,
    country: values.country,
    instagram: values.instagram.replace(/^@/, ''),
    location: values.location,
    experience: values.experience,
    stage: values.stage,
    revenue: values.revenue,
    challenges: values.challenges,
    challengeOther: values.challenges.includes('Outro') ? values.challengeOther : '',
    focusArea: values.focusArea,
    sixMonths: values.sixMonths,
    targetRevenue: values.targetRevenue,
    expectation: values.expectation,
    expectationOther: values.expectation === 'Outro' ? values.expectationOther : '',
    need: values.need,
    mentoring: values.mentoring,
    openness: values.openness,
  };

  const answers = JSON.stringify(record);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(answers));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const createdAt = new Date().toISOString();
  const { webhookUrl, webhookToken } = getConfig();
  if (!webhookUrl) return json({ error: 'O webhook de inscrição ainda não foi configurado.' }, 503);
  const webhookPayload = {
    nome_completo: record.fullName,
    pais_do_whatsapp: record.country,
    whatsapp: record.phone,
    email: record.email,
    instagram_profissional: record.instagram,
    cidade_e_estado: record.location,
    experiencia_com_harmonizacao_facial: record.experience,
    momento_atual_da_clinica: record.stage,
    faturamento_mensal_atual: record.revenue,
    principais_desafios: record.challenges,
    outro_desafio: record.challengeOther,
    area_prioritaria_para_a_experiencia: record.focusArea,
    objetivo_para_os_proximos_6_meses: record.sixMonths,
    faturamento_mensal_desejado: record.targetRevenue,
    expectativa_para_o_encontro: record.expectation,
    outra_expectativa: record.expectationOther,
    principal_necessidade_para_alcancar_o_proximo_nivel: record.need,
    experiencia_anterior_com_mentorias_ou_consultorias: record.mentoring,
    interesse_em_conhecer_acompanhamento_do_ritchie_e_do_time: record.openness,
    id_da_inscricao: values.submissionId,
    evento: EVENT_KEY,
    enviado_em: createdAt,
  };

  try {
    const savedHash = await saveRegistration({
      submissionId: values.submissionId,
      eventKey: EVENT_KEY,
      record,
      answers,
      hash,
      noticeVersion: NOTICE_VERSION,
      createdAt,
    });
    if (savedHash !== hash) return json({ error: 'As respostas foram alteradas. Confira o formulário e envie novamente.' }, 409);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
          'X-Event-Key': EVENT_KEY,
          'X-Submission-Id': values.submissionId,
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`webhook_${response.status}`);
    } catch {
      console.error('registration_webhook_failed');
      return json({ error: 'Não conseguimos confirmar sua inscrição no n8n. Tente novamente em instantes.' }, 503);
    }

    return json({ ok: true, redirectUrl: GROUP_URL });
  } catch {
    // Never log contact data or questionnaire answers.
    console.error('registration_save_failed');
    return json({ error: 'Não conseguimos salvar agora. Suas respostas continuam na tela. Tente enviar novamente.' }, 503);
  }
}
