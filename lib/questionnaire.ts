import { z } from 'zod';
import { getCountries, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

export const GROUP_URL = 'https://chat.whatsapp.com/FEBBn2uqs5iCenG348y35L?s=cl&p=i&mlu=4&ilr=4';
export const EVENT_KEY = 'proximo_nivel_2026_10_08';
export const NOTICE_VERSION = 'inscricao-v1';

export const questions = {
  experience: { title: 'Há quanto tempo você atua com Harmonização Facial?', options: ['Menos de 1 ano', '1 a 2 anos', '3 a 5 anos', 'Mais de 5 anos'] },
  stage: { title: 'Qual dessas opções melhor representa seu momento hoje?', options: ['Estou começando a construir minha agenda', 'Já tenho pacientes, mas meu faturamento ainda oscila muito', 'Tenho uma operação funcionando e quero crescer', 'Tenho uma clínica estruturada e quero aumentar lucratividade e previsibilidade', 'Estou em fase de expansão da minha clínica/equipe'] },
  revenue: { title: 'Qual é hoje a média de faturamento mensal da sua operação?', options: ['Até R$ 20 mil', 'R$ 20 mil a R$ 40 mil', 'R$ 40 mil a R$ 70 mil', 'R$ 70 mil a R$ 100 mil', 'R$ 100 mil a R$ 200 mil', 'Acima de R$ 200 mil', 'Prefiro não informar'] },
  challenges: { title: 'Hoje, qual é o principal desafio que está impedindo seu próximo nível?', options: ['Atrair pacientes com maior poder de compra', 'Ter uma agenda mais previsível', 'Converter mais avaliações em tratamentos', 'Cobrar melhor pelo meu trabalho', 'Me posicionar e ser mais valorizado', 'Organizar meu comercial', 'Aumentar meu faturamento', 'Aumentar minha lucratividade', 'Montar/gerenciar equipe', 'Organizar processos da clínica', 'Sair do operacional', 'Expandir a clínica', 'Outro'] },
  focusArea: { title: 'Se o Ritchie pudesse olhar para UMA área do seu negócio durante essa experiência, qual você gostaria que fosse? Por quê?' },
  sixMonths: { title: 'Se os próximos 6 meses forem os melhores 6 meses da sua carreira até aqui, o que terá mudado?' },
  targetRevenue: { title: 'Qual faturamento mensal você gostaria de alcançar nos próximos 6 a 12 meses?', options: ['Até R$ 50 mil', 'R$ 50 mil a R$ 100 mil', 'R$ 100 mil a R$ 200 mil', 'R$ 200 mil a R$ 300 mil', 'R$ 300 mil a R$ 500 mil', 'Acima de R$ 500 mil'] },
  expectation: { title: 'O que você mais espera viver nesse encontro com o Ritchie?', options: ['Ter mais clareza sobre meus próximos passos', 'Melhorar minha estratégia de crescimento', 'Entender como aumentar meu faturamento', 'Melhorar posicionamento e autoridade', 'Estruturar melhor minha clínica', 'Melhorar meu comercial', 'Aprender com a experiência do Ritchie', 'Fazer conexões com outros profissionais', 'Entender como chegar ao meu próximo nível', 'Outro'] },
  need: { title: 'Hoje, para alcançar esse próximo nível, o que você sente que mais precisa?', options: ['Mais conhecimento técnico', 'Estratégia e direcionamento', 'Acompanhamento de alguém mais experiente', 'Processos e gestão', 'Marketing e posicionamento', 'Comercial e vendas', 'Organização financeira', 'Equipe', 'Networking e conexões'] },
  mentoring: { title: 'Você já investe ou já investiu em mentorias, consultorias ou acompanhamentos para desenvolver seu negócio?', options: ['Sim, atualmente tenho acompanhamento', 'Sim, já investi anteriormente', 'Ainda não'] },
  openness: { title: 'Se durante o encontro você identificar que existe um caminho para acelerar seu crescimento com acompanhamento do Ritchie e do time, você estaria aberto(a) a conhecer essa possibilidade?', options: ['Sim, com certeza', 'Sim, dependendo da proposta', 'Talvez', 'Neste momento quero apenas aproveitar o encontro'] },
} as const;

const choice = (options: readonly string[]) => z.string().refine(value => options.includes(value), 'Selecione uma opção.');
const shortText = (min: number, max: number, message: string) => z.string().trim().min(min, message).max(max, `Use até ${max} caracteres.`);
export const fieldsSchema = z.object({
  fullName: shortText(3, 120, 'Informe seu nome e sobrenome.').refine(value => /^\p{L}[\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}'’.-]+)+$/u.test(value), 'Informe seu nome e sobrenome.'),
  country: z.string().refine(value => getCountries().includes(value as CountryCode), 'Selecione o país do seu WhatsApp.'),
  phone: shortText(6, 32, 'Informe seu WhatsApp com DDD.'),
  email: z.string().trim().max(254).email('Informe um e-mail válido.'),
  instagram: shortText(1, 100, 'Informe seu Instagram profissional.').refine(value => /^@?[a-zA-Z0-9._]{1,30}$/.test(value), 'Informe o @ do perfil, sem espaços ou endereço do site.'),
  location: shortText(3, 120, 'Informe sua cidade e seu estado.'),
  experience: choice(questions.experience.options),
  stage: choice(questions.stage.options),
  revenue: choice(questions.revenue.options),
  challenges: z.array(choice(questions.challenges.options)).min(1, 'Escolha de 1 a 3 desafios.').max(3, 'Escolha no máximo 3 desafios.').refine(values => new Set(values).size === values.length, 'Selecione opções diferentes.'),
  challengeOther: z.string().trim().max(500, 'Use até 500 caracteres.'),
  focusArea: shortText(5, 3000, 'Conte qual área você escolheria e por quê.'),
  sixMonths: shortText(5, 3000, 'Conte o que você deseja alcançar.'),
  targetRevenue: choice(questions.targetRevenue.options),
  expectation: choice(questions.expectation.options),
  expectationOther: z.string().trim().max(500, 'Use até 500 caracteres.'),
  need: choice(questions.need.options),
  mentoring: choice(questions.mentoring.options),
  openness: choice(questions.openness.options),
});

export type FormValues = z.infer<typeof fieldsSchema>;
export type FieldName = keyof FormValues;
export const emptyValues: FormValues = { fullName: '', country: 'BR', phone: '', email: '', instagram: '', location: '', experience: '', stage: '', revenue: '', challenges: [], challengeOther: '', focusArea: '', sixMonths: '', targetRevenue: '', expectation: '', expectationOther: '', need: '', mentoring: '', openness: '' };
export const steps = [
  {title:'Seus dados', description:'Como podemos falar com você?', fields:['fullName','country','phone','email','instagram','location']},
  {title:'Sua clínica', description:'Vamos entender seu momento atual.', fields:['experience','stage','revenue']},
  {title:'Desafios e metas', description:'O que você quer transformar no seu negócio?', fields:['challenges','challengeOther','focusArea','sixMonths','targetRevenue']},
  {title:'Próximo nível', description:'O que você espera dessa experiência?', fields:['expectation','expectationOther','need','mentoring','openness']},
] as const;

export function validatePhone(phone: string, country: string) {
  if (!getCountries().includes(country as CountryCode)) return null;
  const parsed = parsePhoneNumberFromString(phone, country as CountryCode);
  if (!parsed?.isValid() || parsed.country !== country || parsed.ext) return null;
  if (country === 'BR' && (parsed.nationalNumber.length !== 11 || parsed.nationalNumber[2] !== '9')) return null;
  return parsed.number;
}

export function validateValues(values: FormValues, onlyFields?: readonly string[]) {
  const errors: Partial<Record<FieldName,string>> = {};
  const parsed = fieldsSchema.safeParse(values);
  if (!parsed.success) for (const issue of parsed.error.issues) {
    const key = issue.path[0] as FieldName;
    if (!errors[key]) errors[key] = issue.message;
  }
  if (!validatePhone(values.phone,values.country)) errors.phone = values.country === 'BR' ? 'Informe um celular válido com DDD e 9 dígitos. Ex.: (85) 91234-5678.' : 'Informe um telefone válido para o país selecionado.';
  if (values.challenges.includes('Outro') && !values.challengeOther.trim()) errors.challengeOther = 'Descreva o outro desafio.';
  if (values.expectation === 'Outro' && !values.expectationOther.trim()) errors.expectationOther = 'Conte o que você espera do encontro.';
  if (onlyFields) for (const key of Object.keys(errors) as FieldName[]) if (!onlyFields.includes(key)) delete errors[key];
  return errors;
}

export const submissionSchema = fieldsSchema.extend({ submissionId: z.string().uuid(), website: z.string().max(0) }).strict();
