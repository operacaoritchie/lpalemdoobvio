'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

export type LeadResult = {
  reference: string;
  cta: string;
  tracking: Record<string, string>;
};

export const PROFESSIONS = ['Dentista', 'Biomédico(a)', 'Médico(a)', 'Outra'];
export const EXPERIENCE = ['Ainda não atuo', 'Menos de 1 ano', '1 a 2 anos', '3 a 5 anos', 'Mais de 5 anos'];
export const FULL_FACE = ['Ainda não faço', 'Faço alguns procedimentos', 'Já faço Full Face'];
export const DIFFICULTIES = ['Segurança técnica', 'Posicionamento', 'Captação de pacientes', 'Faturamento'];
export const ATTENDED = ['Sim', 'Não'];

type Fields = {
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  profession: string;
  professionOther: string;
  experience: string;
  fullFace: string;
  difficulty: string;
  attended: string;
  instagram: string;
  registry: string;
  consent: boolean;
};

const EMPTY: Fields = {
  name: '', whatsapp: '', email: '', city: '', profession: '', professionOther: '', experience: '',
  fullFace: '', difficulty: '', attended: '', instagram: '', registry: '', consent: false,
};

type Props = {
  open: boolean;
  cta: string;
  tracking: Record<string, string>;
  reference: string;
  onClose: () => void;
  onSuccess: (result: LeadResult, fields: Record<string, string>) => void;
  buildWhatsappUrl: (fields: Record<string, string>, reference: string, cta: string) => string;
};

function normalizePhone(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  const parsed = parsePhoneNumberFromString(value, value.startsWith('+') ? undefined : 'BR');
  return parsed?.isValid() ? parsed.number.replace('+', '') : null;
}

function Choice({ legend, name, options, value, onChange, error }: { legend: string; name: string; options: string[]; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <fieldset className="lm-field lm-choice" aria-invalid={!!error}>
      <legend>{legend}</legend>
      <div className="lm-opts">
        {options.map(option => (
          <label key={option} className={value === option ? 'is-on' : ''}>
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {error && <p className="lm-err">{error}</p>}
    </fieldset>
  );
}

export default function LeadModal({ open, cta, tracking, reference, onClose, onSuccess, buildWhatsappUrl }: Props) {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'failed'>('idle');
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => firstRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields(current => ({ ...current, [key]: value }));
    setErrors(current => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const flat = (phone: string): Record<string, string> => ({
    name: fields.name.trim(),
    whatsapp: phone,
    email: fields.email.trim(),
    city: fields.city.trim(),
    profession: fields.profession === 'Outra' && fields.professionOther.trim() ? `Outra: ${fields.professionOther.trim()}` : fields.profession,
    experience: fields.experience,
    fullFace: fields.fullFace,
    difficulty: fields.difficulty,
    attended: fields.attended,
    instagram: fields.instagram.trim(),
    registry: fields.registry.trim(),
  });

  const validate = () => {
    const next: Partial<Record<keyof Fields, string>> = {};
    if (fields.name.trim().split(/\s+/).filter(Boolean).length < 2) next.name = 'Informe nome e sobrenome.';
    if (!normalizePhone(fields.whatsapp)) next.whatsapp = 'Informe um WhatsApp válido, com DDD.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email.trim())) next.email = 'Informe um e-mail válido.';
    if (fields.city.trim().length < 2) next.city = 'Informe sua cidade.';
    if (!fields.profession) next.profession = 'Escolha uma opção.';
    if (fields.profession === 'Outra' && !fields.professionOther.trim()) next.professionOther = 'Conte qual é a sua profissão.';
    if (!fields.experience) next.experience = 'Escolha uma opção.';
    if (!fields.fullFace) next.fullFace = 'Escolha uma opção.';
    if (!fields.difficulty) next.difficulty = 'Escolha uma opção.';
    if (!fields.attended) next.attended = 'Escolha uma opção.';
    if (!fields.consent) next.consent = 'Aceite para continuarmos pelo WhatsApp.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === 'sending') return;
    if (!validate()) {
      window.setTimeout(() => document.querySelector<HTMLElement>('.lm [aria-invalid="true"], .lm .lm-err')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30);
      return;
    }
    const phone = normalizePhone(fields.whatsapp)!;
    const data = flat(phone);
    setStatus('sending');
    try {
      const response = await fetch('/api/alem-do-obvio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lead', reference, cta, tracking, page: window.location.href, consent: true, ...data }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; reference?: string; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error || 'falha');
      onSuccess({ reference: body.reference || reference, cta, tracking }, data);
    } catch {
      setStatus('failed');
    }
  };

  const fallbackUrl = () => buildWhatsappUrl(flat(normalizePhone(fields.whatsapp) || fields.whatsapp), reference, cta);

  return (
    <div className="lm-back" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <style>{CSS}</style>
      <div className="lm" role="dialog" aria-modal="true" aria-labelledby="lm-title">
        <button type="button" className="lm-x" onClick={onClose} aria-label="Fechar">×</button>
        <p className="lm-kicker">Além do Óbvio</p>
        <h2 id="lm-title">Conte um pouco sobre você</h2>
        <p className="lm-sub">Leva 1 minuto. Em seguida, você continua a conversa com a nossa equipe no WhatsApp.</p>
        <form onSubmit={submit} noValidate>
          <div className="lm-field">
            <label htmlFor="lm-name">Nome completo</label>
            <input ref={firstRef} id="lm-name" autoComplete="name" value={fields.name} onChange={e => set('name', e.target.value)} aria-invalid={!!errors.name} />
            {errors.name && <p className="lm-err">{errors.name}</p>}
          </div>
          <div className="lm-row">
            <div className="lm-field">
              <label htmlFor="lm-wa">WhatsApp</label>
              <input id="lm-wa" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={fields.whatsapp} onChange={e => set('whatsapp', e.target.value)} aria-invalid={!!errors.whatsapp} />
              {errors.whatsapp && <p className="lm-err">{errors.whatsapp}</p>}
            </div>
            <div className="lm-field">
              <label htmlFor="lm-mail">E-mail</label>
              <input id="lm-mail" type="email" inputMode="email" autoComplete="email" value={fields.email} onChange={e => set('email', e.target.value)} aria-invalid={!!errors.email} />
              {errors.email && <p className="lm-err">{errors.email}</p>}
            </div>
          </div>
          <div className="lm-field">
            <label htmlFor="lm-city">Cidade</label>
            <input id="lm-city" autoComplete="address-level2" value={fields.city} onChange={e => set('city', e.target.value)} aria-invalid={!!errors.city} />
            {errors.city && <p className="lm-err">{errors.city}</p>}
          </div>
          <Choice legend="Profissão" name="profession" options={PROFESSIONS} value={fields.profession} onChange={v => set('profession', v)} error={errors.profession} />
          {fields.profession === 'Outra' && (
            <div className="lm-field">
              <label htmlFor="lm-other">Qual?</label>
              <input id="lm-other" value={fields.professionOther} onChange={e => set('professionOther', e.target.value)} aria-invalid={!!errors.professionOther} />
              {errors.professionOther && <p className="lm-err">{errors.professionOther}</p>}
            </div>
          )}
          <Choice legend="Há quanto tempo você atua no mercado?" name="experience" options={EXPERIENCE} value={fields.experience} onChange={v => set('experience', v)} error={errors.experience} />
          <Choice legend="Você já faz harmonização facial?" name="fullFace" options={FULL_FACE} value={fields.fullFace} onChange={v => set('fullFace', v)} error={errors.fullFace} />
          <Choice legend="Qual é a sua maior dificuldade hoje?" name="difficulty" options={DIFFICULTIES} value={fields.difficulty} onChange={v => set('difficulty', v)} error={errors.difficulty} />
          <Choice legend="Você já fez algum curso com o Dr. Ritchie?" name="attended" options={ATTENDED} value={fields.attended} onChange={v => set('attended', v)} error={errors.attended} />
          <div className="lm-row">
            <div className="lm-field">
              <label htmlFor="lm-ig">Instagram <em>(opcional)</em></label>
              <input id="lm-ig" placeholder="@seuperfil" autoCapitalize="none" value={fields.instagram} onChange={e => set('instagram', e.target.value)} />
            </div>
            <div className="lm-field">
              <label htmlFor="lm-reg">Registro profissional <em>(opcional)</em></label>
              <input id="lm-reg" placeholder="CRO / CRM / CRBM" value={fields.registry} onChange={e => set('registry', e.target.value)} />
            </div>
          </div>
          <label className="lm-consent">
            <input type="checkbox" checked={fields.consent} onChange={e => set('consent', e.target.checked)} />
            <span>Aceito receber contato da equipe do Dr. Ritchie pelo WhatsApp sobre o Além do Óbvio.</span>
          </label>
          {errors.consent && <p className="lm-err">{errors.consent}</p>}
          {status === 'failed' && (
            <div className="lm-fail" role="alert">
              <p>Não conseguimos enviar seus dados agora. Tente de novo ou fale direto com a equipe.</p>
              <a href={fallbackUrl()} target="_blank" rel="noopener noreferrer">Falar no WhatsApp mesmo assim</a>
            </div>
          )}
          <button type="submit" className="lm-go" disabled={status === 'sending'}>
            {status === 'sending' ? 'Enviando…' : 'Continuar no WhatsApp'}
          </button>
        </form>
      </div>
    </div>
  );
}

const CSS = `
.lm-back{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.78);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 16px}
.lm{position:relative;width:100%;max-width:560px;margin:auto;background:var(--bg2,#100e0b);color:var(--fg,#f3efe8);border:1px solid var(--line,rgba(201,168,106,.22));border-radius:16px;padding:32px 28px;font-family:var(--sans,Arial,sans-serif)}
.lm-x{position:absolute;top:10px;right:12px;width:40px;height:40px;background:none;border:0;color:var(--mute,#b0aa9f);font-size:28px;line-height:1;cursor:pointer}
.lm-kicker{margin:0 0 6px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold,#c9a86a)}
.lm h2{margin:0 0 8px;font-family:var(--serif,Georgia,serif);font-weight:600;font-size:30px;line-height:1.1}
.lm-sub{margin:0 0 22px;color:var(--mute,#b0aa9f);font-size:15px;line-height:1.5}
.lm-field{margin:0 0 16px;border:0;padding:0;min-width:0}
.lm-field label,.lm-choice legend{display:block;margin:0 0 6px;padding:0;font-size:14px;font-weight:600;color:var(--fg,#f3efe8)}
.lm-field label em{font-style:normal;font-weight:400;color:var(--mute,#b0aa9f)}
.lm input:not([type=radio]):not([type=checkbox]){width:100%;height:48px;padding:0 14px;background:#0b0a08;color:var(--fg,#f3efe8);border:1px solid var(--line,rgba(201,168,106,.22));border-radius:10px;font:inherit;font-size:16px}
.lm input:focus-visible{outline:2px solid var(--gold,#c9a86a);outline-offset:1px}
.lm input[aria-invalid=true],.lm fieldset[aria-invalid=true]{border-color:#e07a6a}
.lm-row{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
.lm-opts{display:flex;flex-wrap:wrap;gap:8px}
.lm-opts label{margin:0;position:relative;cursor:pointer}
.lm-opts input{position:absolute;opacity:0;pointer-events:none}
.lm-opts span{display:block;padding:11px 14px;border:1px solid var(--line,rgba(201,168,106,.22));border-radius:10px;font-size:14px;font-weight:500;color:var(--fg,#f3efe8)}
.lm-opts label.is-on span{background:var(--gold,#c9a86a);border-color:var(--gold,#c9a86a);color:#16120a;font-weight:700}
.lm-opts input:focus-visible+span{outline:2px solid var(--gold2,#e3cb95);outline-offset:2px}
.lm-consent{display:flex;gap:10px;align-items:flex-start;margin:6px 0 4px;font-size:13px;line-height:1.45;color:var(--mute,#b0aa9f);cursor:pointer}
.lm-consent input{margin-top:3px;width:18px;height:18px;flex:none;accent-color:var(--gold,#c9a86a)}
.lm-err{margin:6px 0 0;font-size:13px;color:#f0937f}
.lm-fail{margin:14px 0 0;padding:12px 14px;border:1px solid #e07a6a;border-radius:10px;font-size:14px}
.lm-fail p{margin:0 0 8px}
.lm-fail a{color:var(--gold2,#e3cb95);font-weight:700}
.lm-go{width:100%;margin-top:18px;height:54px;border:0;border-radius:999px;background:linear-gradient(180deg,var(--gold2,#e3cb95),var(--gold,#c9a86a));color:#16120a;font:inherit;font-size:16px;font-weight:800;cursor:pointer}
.lm-go[disabled]{opacity:.6;cursor:wait}
@media (max-width:560px){.lm{padding:28px 18px}.lm-row{grid-template-columns:1fr}.lm h2{font-size:26px}}
`;
