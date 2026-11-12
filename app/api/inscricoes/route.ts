import { handleRegistration, type RegistrationStore } from '@/lib/registration-server';

export const runtime = 'nodejs';

const acknowledgeRegistration: RegistrationStore = async ({ hash }) => hash;

export function POST(request: Request) {
  return handleRegistration(request, acknowledgeRegistration, () => ({
    webhookUrl: process.env.FORM_WEBHOOK_URL,
    webhookToken: process.env.FORM_WEBHOOK_TOKEN,
  }));
}
