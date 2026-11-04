import {EmailSignIn} from '@/components/email-signin';
import {safeNext} from '@/lib/navigation';
export const metadata={title:'Sign in — CALBOK'};
export default async function SignInPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <EmailSignIn next={safeNext((await searchParams).next)}/>;}
