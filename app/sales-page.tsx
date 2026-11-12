'use client';

import { useCallback, useEffect, useState } from 'react';
import './sales-polish.css';
import LeadModal, { type LeadResult } from './lead-modal';
import { salesPageHtml } from './alem-do-obvio/source';

const TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'angulo', 'campaign_name', 'campaign_id', 'adset_name', 'adset_id', 'ad_name', 'ad_id', 'campaign.name', 'campaign.id', 'adset.name', 'adset.id', 'ad.name', 'ad.id', 'fbclid'];
const TEAM_WHATSAPP = '5511936206406';

function readTracking() {
  const params = new URLSearchParams(window.location.search);
  const tracking: Record<string, string> = {};
  for (const key of TRACKING_KEYS) if (params.get(key)) tracking[key] = params.get(key)!;
  for (const item of document.cookie.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (['_fbp', '_fbc'].includes(key) && parts.length) tracking[key] = parts.join('=');
  }
  try {
    const previous = JSON.parse(sessionStorage.getItem('ao_tracking') || '{}') as Record<string, string>;
    Object.assign(tracking, previous, tracking);
    sessionStorage.setItem('ao_tracking', JSON.stringify(tracking));
    document.cookie = `ao_tracking=${encodeURIComponent(JSON.stringify(tracking))}; Max-Age=1800; Path=/; SameSite=Lax`;
  } catch { /* storage unavailable */ }
  return tracking;
}


// Teste dinâmico (Herickson): a headline do topo muda conforme o ângulo do anúncio, lido de utm_content (ou utm_term / angulo).
// Sem UTM de ângulo, a página mantém o título original "Além do Óbvio".
const ANGLES: Record<string, { h1: string; lead?: string }> = {
  dualidade: { h1: 'Conhecer a técnica é uma coisa. <em>Compreender o raciocínio</em> é outra.', lead: 'Três dias de imersão presencial em Full Face com o Dr. Ritchie, com prática em pacientes reais.' },
  pergunta: { h1: 'Você já atende. <em>Mas o Full Face ainda não sai do papel?</em>', lead: 'Em três dias, com o Dr. Ritchie ao seu lado e pacientes reais, você aprende a planejar, avaliar e conduzir.' },
  consciencia: { h1: 'O resultado do Full Face não está só na técnica. <em>Está na decisão clínica.</em>', lead: 'É essa decisão que o Dr. Ritchie ensina de perto, no Além do Óbvio.' },
  historia: { h1: 'Três dias ao lado do Dr. Ritchie, <em>com pacientes reais.</em>', lead: 'Uma turma de no máximo 12 alunos, para você sair do curso executando com segurança.' },
};

function applyAngle(tracking: Record<string, string>) {
  const raw = (tracking.angulo || tracking.utm_content || tracking.utm_term || '').toLowerCase();
  const key = Object.keys(ANGLES).find(k => raw.includes(k));
  if (!key) return;
  const h1 = document.querySelector('.hero h1');
  const lead = document.querySelector('.hero .lead');
  if (h1) h1.innerHTML = ANGLES[key].h1;
  if (lead && ANGLES[key].lead) lead.textContent = ANGLES[key].lead!;
  tracking.angulo = key;
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '28204701035866392';

function loadPixel(pixelId: string) {
  if (!pixelId || (window as Window).fbq) return;
  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function (...args: unknown[]) { n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args); });
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement; t.async = true; t.src = v;
    const s0 = b.getElementsByTagName(e)[0]; s0.parentNode?.insertBefore(t, s0);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  (window as Window).fbq?.('init', pixelId);
}

function pageViewParams(tracking: Record<string, string>) {
  return { content_name: 'Além do Óbvio', content_category: 'Imersão presencial', page_url: window.location.href, referrer: document.referrer || undefined, ...tracking };
}

const ZERO_WIDTH = ['\u200B', '\u200C', '\u200D', '\u2060'];

// Codifica o JSON em caracteres de largura zero (4 por byte): nada aparece na mensagem do WhatsApp.
function invisibleToken(value: Record<string, string>) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let out = '\u2063';
  bytes.forEach(byte => {
    out += ZERO_WIDTH[(byte >> 6) & 3] + ZERO_WIDTH[(byte >> 4) & 3] + ZERO_WIDTH[(byte >> 2) & 3] + ZERO_WIDTH[byte & 3];
  });
  return out + '\u2063';
}

function whatsappUrl(tracking: Record<string, string>, fields: Record<string, string>, reference: string, cta: string) {
  const intro = fields.name ? `Sou ${fields.name}${fields.profession ? `, ${fields.profession}` : ''}${fields.city ? `, de ${fields.city}` : ''}.` : '';
  const lines = [
    `Olá!${invisibleToken({ ...tracking, ref: reference, cta })} Quero saber valores e condições do Além do Óbvio.`,
    intro,
    fields.difficulty ? `Minha maior dificuldade hoje: ${fields.difficulty}.` : '',
    `Ref: ${reference}`,
  ].filter(Boolean);
  return `https://wa.me/${TEAM_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export default function SalesPage() {
  const [modal, setModal] = useState<{ cta: string; tracking: Record<string, string>; reference: string } | null>(null);
  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    const tracking = readTracking();
    applyAngle(tracking);
    loadPixel(PIXEL_ID);
    const pageEventId = `pv-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
    try { window.fbq?.('track', 'PageView', pageViewParams(tracking), { eventID: pageEventId }); } catch { /* pixel optional */ }
    if (window.dataLayer) window.dataLayer.push({ event: 'ao_page_view', event_id: pageEventId, ...tracking });
    const reference = `AO-${crypto.randomUUID().replaceAll('-', '').slice(0, 4).toUpperCase()}`;
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-evt]'));

    // Os botões abrem o formulário; sem JavaScript continuam levando direto ao WhatsApp.
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      const cta = (event.currentTarget as HTMLAnchorElement).dataset.evt || 'cta';
      if (window.dataLayer) window.dataLayer.push({ event: 'ao_form_open', cta, ...tracking });
      setModal({ cta, tracking, reference });
    };

    for (const link of links) link.addEventListener('click', onClick);
    // Checklist "Marque o que você vive hoje": mostra o resultado e o botão conforme a quantidade marcada.
    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('.chk input[type="checkbox"]'));
    const checkText = document.getElementById('chkt');
    const checkCta = document.getElementById('chkc');
    const updateChecklist = () => {
      const count = boxes.filter(box => box.checked).length;
      if (checkText) {
        checkText.textContent = count === 0
          ? 'Marque ao menos um item para ver o resultado.'
          : count <= 2
            ? `Você marcou ${count} de ${boxes.length}. Já existe um ponto claro para evoluir, e é exatamente isso que trabalhamos de perto nos três dias.`
            : count <= 5
              ? `Você marcou ${count} de ${boxes.length}. O Além do Óbvio foi desenhado para esse momento: prática em pacientes reais e o raciocínio por trás de cada decisão.`
              : `Você marcou ${count} de ${boxes.length}. Esse é o perfil de quem mais aproveita a imersão. Vale conversar com a equipe sobre a turma de dezembro.`;
      }
      if (checkCta) {
        checkCta.style.display = count ? '' : 'none';
        checkCta.textContent = count ? 'Quero conversar sobre a minha vaga' : 'Falar com a equipe';
      }
    };
    for (const box of boxes) box.addEventListener('change', updateChecklist);
    updateChecklist();
    // Entrada suave dos blocos ao rolar. Sem JavaScript ou com "reduzir movimento", tudo aparece direto.
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>(
      '.ao section > .eyebrow, .ao section h2, .ao section > p, .ao .cols > div > p, .ao .cards li, .ao .gal figure, .ao .day, .ao .depo figure, .ao .chk li, .ao details, .ao .price, .ao .nums div, .ao .cols > div > img, .ao .final-t > *',
    ));
    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in');
          observer?.unobserve(entry.target);
        }
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      for (const el of revealTargets) {
        const index = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
        el.style.setProperty('--d', `${Math.min(index, 5) * 70}ms`);
        el.classList.add('rv');
        observer.observe(el);
      }
    }

    const sticky = document.querySelector<HTMLElement>('.sticky');
    const updateSticky = () => sticky?.classList.toggle('is-visible', window.scrollY > 600);
    updateSticky();
    window.addEventListener('scroll', updateSticky, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateSticky);
      observer?.disconnect();
      for (const el of revealTargets) el.classList.remove('rv', 'in');
      for (const link of links) link.removeEventListener('click', onClick);
      for (const box of boxes) box.removeEventListener('change', updateChecklist);
    };
  }, []);

  const onSuccess = useCallback((result: LeadResult, fields: Record<string, string>) => {
    const { reference, cta, tracking } = result;
    if (window.dataLayer) window.dataLayer.push({ event: 'click_whatsapp', cta, reference, ...tracking });
    if (window.fbq) {
      try {
        window.fbq('track', 'Lead', { content_name: 'Além do Óbvio', cta }, { eventID: `${reference}-lead` });
        window.fbq('track', 'Contact', { content_name: 'Além do Óbvio', cta }, { eventID: `${reference}-contact` });
        window.fbq('trackCustom', 'LeadWhatsApp', { content_name: 'Além do Óbvio', cta, reference, ...tracking }, { eventID: `${reference}-leadwhatsapp` });
      } catch { /* pixel optional */ }
    }
    if (window.gtag) { try { window.gtag('event', 'generate_lead', { cta, event_id: reference, ...tracking }); } catch { /* analytics optional */ } }
    setModal(null);
    // Pequena espera para o Pixel disparar antes de sair da página.
    window.setTimeout(() => { window.location.href = whatsappUrl(tracking, fields, reference, cta); }, 250);
  }, []);

  return (
    <>
      <div className="ao" dangerouslySetInnerHTML={{ __html: salesPageHtml }} />
      <LeadModal
        open={!!modal}
        cta={modal?.cta || 'cta'}
        tracking={modal?.tracking || {}}
        reference={modal?.reference || ''}
        onClose={closeModal}
        onSuccess={onSuccess}
        buildWhatsappUrl={(fields, reference, cta) => whatsappUrl(modal?.tracking || {}, fields, reference, cta)}
      />
    </>
  );
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}
