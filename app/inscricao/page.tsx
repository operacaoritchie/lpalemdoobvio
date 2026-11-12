import type { Metadata } from 'next';
import RegistrationForm from './registration-form';

export const metadata: Metadata = {title:'Sua inscrição — O Próximo Nível com Dr. Ritchie',description:'Conte seu momento, seus desafios e o que espera do encontro com Dr. Ritchie.'};
export default function RegistrationPage() { return <RegistrationForm />; }
