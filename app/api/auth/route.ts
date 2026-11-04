import {signInIpLimited} from '@/lib/signin-limit';
import {z} from 'zod';
import {accountDetails} from '@/lib/account-profile';
import {body,originGuard} from '@/lib/http';
import {cookie,createSession,emailReady,emailSetupStatus,testOwnerEmail,matchesOperator,principal,requestCode,revokeSession,verifyCode} from '@/lib/auth';
export const runtime='nodejs';
const response=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function GET(request:Request){const denied=originGuard(request);if(denied)return denied;const user=principal(request);return response({user:user?accountDetails(user):null,emailAvailable:emailReady(),...(user?.role==='operator'?{emailSetup:emailSetupStatus()}:{}),publicSignup:process.env.CALBOK_PUBLIC_SIGNIN_ENABLED==='true'});}
export async function POST(request:Request){
  const denied=originGuard(request,true);if(denied)return denied;
  try {
    const input=z.discriminatedUnion('action',[
      z.object({action:z.literal('request'),email:z.email().max(254).transform(value=>value.trim().toLowerCase())}),
      z.object({action:z.literal('verify'),id:z.uuid(),code:z.string().regex(/^\d{8}$/)}),
      z.object({action:z.literal('operator'),token:z.string().max(512)}),
      z.object({action:z.literal('logout')}),
      z.object({action:z.literal('test-email')})
    ]).parse(await body(request));
    if(['request','verify','operator'].includes(input.action)&&signInIpLimited(request))return response({error:'Too many sign-in attempts from this network. Try again in 15 minutes.'},429,{'Retry-After':'900'});
    if(input.action==='test-email'){if(principal(request)?.role!=='operator')return response({error:'Owner access required.'},403);await testOwnerEmail();return response({message:'Resend accepted a sign-in email for the configured owner. Check the owner inbox to confirm delivery.'});}
    if(input.action==='logout'){revokeSession(request);return response({message:'Signed out.'},200,{'Set-Cookie':cookie('',request,true)});}
    if(input.action==='operator'){
      if(!matchesOperator(input.token))return response({error:'Access key not recognized.'},401);
      revokeSession(request);
      return response({message:'Signed in.'},200,{'Set-Cookie':cookie(createSession({id:'operator',role:'operator',email:null}),request)});
    }
    if(!emailReady())return response({error:'Email sign-in is not available yet. The workspace owner needs to configure email delivery.'},503);
    if(input.action==='request'){const id=await requestCode(input.email);return response({id,message:'If this address is eligible, a sign-in code has been sent. Check your inbox.'});}
    const user=verifyCode(input.id,input.code);if(!user)return response({error:'Code expired or not recognized. Request a new code.'},401);
    revokeSession(request);
    return response({message:'Signed in.'},200,{'Set-Cookie':cookie(createSession(user),request)});
  }catch(error){return response({error:error instanceof z.ZodError?'Check your email or eight-digit code.':error instanceof Error?error.message:'Sign-in unavailable.'},400);}
}
