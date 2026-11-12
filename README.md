# Dr. Ritchie — O Próximo Nível

Landing page em `/` e formulário de inscrição em `/inscricao`.

O formulário contém as perguntas de qualificação, WhatsApp com seletor de país (BR/+55 por padrão) e e-mail. As respostas são validadas no navegador e no servidor e enviadas ao webhook de produção do n8n.

## Stack para Vercel

- Next.js 16 com App Router
- React 19
- Node.js 22+
- Webhook n8n para receber e processar as inscrições

A versão original usava `vinext`, Cloudflare Workers e Cloudflare D1. Para rodar na Vercel, o build usa Next.js nativo. O banco não fica na aplicação: o n8n recebe os dados e pode salvá-los no Google Sheets, CRM, Airtable ou outro destino.

## Desenvolvimento local

```bash
pnpm install
cp .env.example .env.local
# preencha FORM_WEBHOOK_URL e FORM_WEBHOOK_TOKEN em .env.local
pnpm dev
```

Comandos disponíveis:

- `pnpm dev`: desenvolvimento local
- `pnpm build`: build de produção
- `pnpm start`: inicia o build de produção
- `pnpm lint`: validação ESLint

## Deploy na Vercel

1. Importe este repositório na Vercel. O projeto já contém `vercel.json`, `pnpm-lock.yaml` e os scripts nativos do Next.js.
2. No n8n, crie um Webhook com método `POST`, configure **Header Auth** e publique o workflow. Use a **Production URL**.
3. Em **Settings → Environment Variables** da Vercel, configure:

   - `FORM_WEBHOOK_URL`: Production URL do Webhook n8n;
   - `FORM_WEBHOOK_TOKEN`: token sem o prefixo `Bearer`.

4. Faça um redeploy para aplicar as variáveis e teste `/`, `/inscricao` e uma inscrição de ponta a ponta.

A aplicação envia automaticamente estes cabeçalhos ao n8n:

```http
Authorization: Bearer SEU_TOKEN
X-Event-Key: masterclass-dritchie-proximo-nivel
X-Submission-Id: identificador-da-submissao
```

Não coloque tokens no repositório.

Os campos enviados no corpo do webhook usam nomes descritivos em português, como `nome_completo`, `cidade_e_estado`, `faturamento_mensal_atual`, `faturamento_mensal_desejado`, `experiencia_anterior_com_mentorias_ou_consultorias` e `interesse_em_conhecer_acompanhamento_do_ritchie_e_do_time`.

## Fluxo da inscrição

```text
Visitante → Formulário Vercel → API Next.js → Webhook n8n → destino definido no workflow
```

Se o webhook não estiver configurado ou responder com erro, a API retorna `503` e a inscrição não é considerada confirmada.

`lib/questionnaire.ts` contém perguntas, regras de validação, identificador do evento e destino do grupo.
