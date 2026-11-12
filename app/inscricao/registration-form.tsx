'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, LockKeyhole } from 'lucide-react';
import { AsYouType, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Combobox, ComboboxTrigger, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@/components/ui/combobox';
import { emptyValues, questions, steps, validateValues, GROUP_URL, type FormValues, type FieldName } from '@/lib/questionnaire';
import countries from '@/lib/countries.json';

type Errors = Partial<Record<FieldName,string>>;
type Country = (typeof countries)[number];
type ChoiceKey = 'experience'|'stage'|'revenue'|'targetRevenue'|'expectation'|'need'|'mentoring'|'openness';

export default function RegistrationForm() {
  const [values,setValues] = useState<FormValues>({...emptyValues,challenges:[]});
  const [step,setStep] = useState(0);
  const [errors,setErrors] = useState<Errors>({});
  const [sending,setSending] = useState(false);
  const [serverError,setServerError] = useState('');
  const [complete,setComplete] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const attempt = useRef({signature:'',id:''});
  const inFlight = useRef(false);
  const selectedCountry = countries.find(country => country.code === values.country) ?? countries.find(country => country.code === 'BR')!;

  function update<K extends FieldName>(field: K,value: FormValues[K]) {
    setValues(old => ({...old,[field]:value}));
    setErrors(old => { const next={...old}; delete next[field]; return next; });
    setServerError('');
  }
  function focusStep(index: number) {
    setStep(index);
    requestAnimationFrame(() => {
      heading.current?.focus({preventScroll:true});
      heading.current?.scrollIntoView({block:'start',behavior:'instant'});
    });
  }
  function focusError(nextErrors: Errors) {
    const first = Object.keys(nextErrors)[0];
    requestAnimationFrame(() => {
      const container = document.querySelector(`[data-field="${first}"]`);
      const target = container?.querySelector<HTMLElement>('input,textarea,button');
      target?.focus();
    });
  }
  function changePhone(raw:string) {
    let country=values.country as CountryCode;
    let digits=raw.replace(/[^\d+]/g,'');
    if (digits.startsWith('+')) {
      const parsed=parsePhoneNumberFromString(digits);
      if(parsed?.country) {country=parsed.country;digits=parsed.nationalNumber;update('country',country);}
    }
    update('phone',new AsYouType(country).input(digits));
  }
  function error(field:FieldName) {return errors[field] ? <p className="field-error" id={`${field}-error`}>{errors[field]}</p> : null;}

  function choice(field:ChoiceKey) {
    const q=questions[field];
    return <fieldset className="question" data-field={field}>
      <legend id={`${field}-label`}>{q.title}</legend>
      <RadioGroup value={values[field]} onValueChange={value=>update(field,value)} className="answer-options" aria-labelledby={`${field}-label`} aria-required="true" aria-invalid={!!errors[field]} aria-describedby={errors[field]?`${field}-error`:undefined}>
        {q.options.map((option,index)=><label className={`answer-option ${values[field]===option?'is-selected':''}`} key={option} htmlFor={`${field}-${index}`}>
          <RadioGroupItem value={option} id={`${field}-${index}`} /><span>{option}</span>
        </label>)}
      </RadioGroup>
      {error(field)}
    </fieldset>;
  }

  function textArea(field:'focusArea'|'sixMonths') {
    return <div className="question" data-field={field}>
      <label className="question-label" htmlFor={field}>{questions[field].title}</label>
      <Textarea id={field} value={values[field]} onChange={event=>update(field,event.target.value)} className="form-input form-textarea" maxLength={3000} placeholder="Conte com suas palavras…" aria-required="true" aria-invalid={!!errors[field]} aria-describedby={errors[field]?`${field}-error`:undefined} />
      {error(field)}
    </div>;
  }

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(inFlight.current)return;
    const nextErrors=validateValues(values,step===3?undefined:steps[step].fields);
    setErrors(nextErrors);
    if(Object.keys(nextErrors).length){
      const invalidStep=steps.findIndex(item=>item.fields.some(field=>nextErrors[field]));
      if(invalidStep!==step && invalidStep>=0) setStep(invalidStep);
      focusError(nextErrors);
      return;
    }
    if(step<3){focusStep(step+1);return;}
    inFlight.current=true;setSending(true);setServerError('');
    const signature=JSON.stringify(values);
    if(attempt.current.signature!==signature)attempt.current={signature,id:crypto.randomUUID()};
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),20000);
    try {
      const response=await fetch('/api/inscricoes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,submissionId:attempt.current.id,website:honeypot.current?.value??''}),signal:controller.signal});
      const result=await response.json() as {ok?:boolean;error?:string;fields?:Errors};
      if(!response.ok || !result.ok){
        if(result.fields){setErrors(result.fields);const index=steps.findIndex(item=>item.fields.some(field=>result.fields?.[field]));if(index>=0)setStep(index);focusError(result.fields);}
        if(response.status===409)attempt.current={signature:'',id:''};
        throw new Error(result.error || 'Não conseguimos salvar agora. Tente novamente.');
      }
      setComplete(true);
      window.setTimeout(()=>window.location.assign(GROUP_URL),250);
    } catch(e) {
      setServerError(e instanceof Error && e.name!=='AbortError' ? e.message : 'A conexão demorou mais que o esperado. Suas respostas continuam aqui. Tente enviar novamente.');
    } finally {
      window.clearTimeout(timeout);inFlight.current=false;setSending(false);
    }
  }

  return <main className="registration-page">
    <header className="registration-header">
      <Link className="event-brand" href="/" aria-label="Voltar para a masterclass O Próximo Nível"><span className="event-brand__category">MASTERCLASS</span><span className="event-brand__name">O PRÓXIMO <span>NÍVEL</span></span></Link>
      <span className="registration-date">08/10 <span>·</span> 21H <span>·</span> AO VIVO</span>
    </header>
    <div className="registration-layout">
      <aside className="registration-intro">
        <span className="form-kicker">COM DR. RITCHIE</span>
        <h1>Antes do<br/><em>nosso encontro…</em></h1>
        <p>Queremos conhecer um pouco melhor o seu momento para que essa experiência seja o mais direcionada possível.</p>
        <p>São poucos minutos. Suas respostas vão nos ajudar a entender <strong>onde você está hoje, quais são seus maiores desafios e o que você espera levar desse encontro com o Dr. Ritchie.</strong></p>
        <div className="intro-portrait" aria-hidden="true"><Image src="/assets/dr-ritchie.webp" alt="" width={1254} height={1254}/><span>Dr. Ritchie</span></div>
        <Link className="back-to-event" href="/"><ArrowLeft size={15}/> Voltar para a masterclass</Link>
      </aside>

      <section className="form-panel" aria-label="Formulário de inscrição">
        {complete ? <div className="registration-success" role="status">
          <span className="success-icon"><Check size={30}/></span>
          <p className="form-kicker">RESPOSTAS RECEBIDAS</p>
          <h2>Agora, entre no grupo.</h2>
          <p>Estamos abrindo o grupo do WhatsApp. Se ele não abrir automaticamente, use o botão abaixo.</p>
          <a className="cta" href={GROUP_URL}>ENTRAR NO GRUPO DO WHATSAPP <ArrowRight size={20}/></a>
        </div> : <>
          <div className="step-status"><span>ETAPA {step+1} DE 4</span><span>{steps[step].title}</span></div>
          <Progress value={((step+1)/4)*100} aria-label={`Etapa ${step+1} de 4: ${steps[step].title}`} className="form-progress"/>
          <h2 className="step-title" tabIndex={-1} ref={heading}>{steps[step].title}</h2>
          <p className="step-description">{steps[step].description}</p>
          <form onSubmit={submit} noValidate>
            <fieldset disabled={sending} className="form-fields">
              <div className="trap-field" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" autoComplete="off" tabIndex={-1} ref={honeypot}/></div>
              {step===0 && <>
                <div className="question" data-field="fullName"><label className="question-label" htmlFor="fullName">Nome e sobrenome</label><Input className="form-input" id="fullName" name="name" autoComplete="name" value={values.fullName} onChange={e=>update('fullName',e.target.value)} maxLength={120} placeholder="Como você se chama?" aria-required="true" aria-invalid={!!errors.fullName} aria-describedby={errors.fullName?'fullName-error':undefined}/>{error('fullName')}</div>
                <div className="question" data-field="phone">
                  <label className="question-label" htmlFor="phone">WhatsApp</label>
                  <div className="phone-field">
                    <Combobox items={countries} value={selectedCountry} onValueChange={(country:Country|null)=>{if(country)update('country',country.code);}} itemToStringLabel={(country:Country)=>`${country.name} +${country.dial}`}>
                      <ComboboxTrigger className="country-trigger" aria-label={`País do WhatsApp: ${selectedCountry.name}, código +${selectedCountry.dial}`}><Image src={`/flags/${selectedCountry.code.toLowerCase()}.svg`} alt="" width={24} height={18}/><span>+{selectedCountry.dial}</span></ComboboxTrigger>
                      <ComboboxContent className="country-popup"><ComboboxInput showTrigger={false} placeholder="Buscar país…" aria-label="Buscar país" className="country-search"/><ComboboxEmpty>Nenhum país encontrado.</ComboboxEmpty><ComboboxList>{(country:Country)=><ComboboxItem key={country.code} value={country} className="country-option"><Image src={`/flags/${country.code.toLowerCase()}.svg`} alt="" width={24} height={18}/><span>{country.name}</span><span className="dial-code">+{country.dial}</span></ComboboxItem>}</ComboboxList></ComboboxContent>
                    </Combobox>
                    <Input className="form-input phone-input" id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" value={values.phone} onChange={e=>changePhone(e.target.value)} maxLength={32} placeholder={values.country==='BR'?'(85) 91234-5678':'Seu número de telefone'} aria-required="true" aria-invalid={!!errors.phone} aria-describedby={`phone-help${errors.phone?' phone-error':''}`}/>
                  </div>
                  <p className="field-hint" id="phone-help">{values.country==='BR'?'Informe o DDD e o número do celular. O +55 já está selecionado.':`Código +${getCountryCallingCode(values.country as CountryCode)} selecionado. Informe o número local completo.`}</p>
                  {error('phone')}{error('country')}
                </div>
                <div className="question" data-field="email"><label className="question-label" htmlFor="email">E-mail</label><Input className="form-input" id="email" name="email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={e=>update('email',e.target.value)} maxLength={254} placeholder="voce@exemplo.com" aria-required="true" aria-invalid={!!errors.email} aria-describedby={errors.email?'email-error':undefined}/>{error('email')}</div>
                <div className="form-two-columns">
                  <div className="question" data-field="instagram"><label className="question-label" htmlFor="instagram">Instagram profissional</label><Input className="form-input" id="instagram" name="instagram" autoCapitalize="none" spellCheck={false} value={values.instagram} onChange={e=>update('instagram',e.target.value)} maxLength={100} placeholder="@seuperfil" aria-required="true" aria-invalid={!!errors.instagram} aria-describedby={errors.instagram?'instagram-error':undefined}/>{error('instagram')}</div>
                  <div className="question" data-field="location"><label className="question-label" htmlFor="location">Cidade / Estado</label><Input className="form-input" id="location" name="location" value={values.location} onChange={e=>update('location',e.target.value)} maxLength={120} placeholder="Fortaleza / CE" aria-required="true" aria-invalid={!!errors.location} aria-describedby={errors.location?'location-error':undefined}/>{error('location')}</div>
                </div>
              </>}
              {step===1 && <>{choice('experience')}{choice('stage')}{choice('revenue')}</>}
              {step===2 && <>
                <fieldset className="question" data-field="challenges">
                  <legend id="challenges-label">{questions.challenges.title}</legend>
                  <div className="selection-hint"><span>Escolha até 3.</span><span aria-live="polite">{values.challenges.length}/3 selecionados</span></div>
                  <div className="answer-options challenge-options" role="group" aria-labelledby="challenges-label" aria-describedby={errors.challenges?'challenges-error':undefined}>
                    {questions.challenges.options.map((option,index)=>{const checked=values.challenges.includes(option);const disabled=values.challenges.length>=3&&!checked;return <label className={`answer-option ${checked?'is-selected':''} ${disabled?'is-disabled':''}`} htmlFor={`challenge-${index}`} key={option}><Checkbox id={`challenge-${index}`} checked={checked} disabled={disabled} onCheckedChange={value=>update('challenges',value===true?[...values.challenges,option].slice(0,3):values.challenges.filter(item=>item!==option))}/><span>{option}</span></label>;})}
                  </div>{error('challenges')}
                  {values.challenges.includes('Outro') && <div className="other-answer" data-field="challengeOther"><label className="question-label" htmlFor="challengeOther">Qual outro desafio?</label><Textarea id="challengeOther" className="form-input" value={values.challengeOther} onChange={e=>update('challengeOther',e.target.value)} maxLength={500} aria-required="true" aria-invalid={!!errors.challengeOther} aria-describedby={errors.challengeOther?'challengeOther-error':undefined}/>{error('challengeOther')}</div>}
                </fieldset>
                {textArea('focusArea')}{textArea('sixMonths')}{choice('targetRevenue')}
              </>}
              {step===3 && <>
                {choice('expectation')}
                {values.expectation==='Outro' && <div className="question" data-field="expectationOther"><label className="question-label" htmlFor="expectationOther">O que mais você espera viver?</label><Textarea id="expectationOther" className="form-input" value={values.expectationOther} onChange={e=>update('expectationOther',e.target.value)} maxLength={500} aria-required="true" aria-invalid={!!errors.expectationOther} aria-describedby={errors.expectationOther?'expectationOther-error':undefined}/>{error('expectationOther')}</div>}
                {choice('need')}{choice('mentoring')}{choice('openness')}
                <p className="form-notice">Ao enviar, você compartilha suas respostas com a equipe do Dr. Ritchie para organização do encontro e contato sobre sua inscrição.</p>
              </>}
            </fieldset>
            {Object.keys(errors).length>0 && <p className="form-error-summary" role="alert">Confira os campos destacados para continuar.</p>}
            {serverError && <p className="form-error-summary" role="alert">{serverError}</p>}
            <div className="form-actions">
              {step>0 && <Button type="button" variant="ghost" onClick={()=>focusStep(step-1)} disabled={sending} className="form-back"><ArrowLeft size={18}/>Voltar</Button>}
              <Button type="submit" disabled={sending} className="cta form-next">{sending?<><LoaderCircle className="animate-spin" size={19}/> SALVANDO RESPOSTAS…</>:<>{step===0?'COMEÇAR MINHA INSCRIÇÃO':step===3?'ENVIAR E ENTRAR NO GRUPO':'CONTINUAR'}<ArrowRight size={20}/></>}</Button>
            </div>
            <p className="form-footnote"><LockKeyhole size={13}/>{step===3?'Suas respostas serão salvas antes de abrir o WhatsApp.':'Seus dados serão usados pela equipe do Dr. Ritchie.'}</p>
          </form>
        </>}
      </section>
    </div>
  </main>;
}
