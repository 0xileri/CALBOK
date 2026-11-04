import {PublicationError} from '@/lib/publication';
import {z} from 'zod';
import {authorize,body,originGuard} from '@/lib/http';
import {principal} from '@/lib/auth';
import {saveAccountProfile} from '@/lib/account-profile';
export const runtime='nodejs';
export async function PATCH(request:Request){
  const origin=originGuard(request,true);if(origin)return origin;
  const denied=authorize(request);if(denied)return denied;
  try {const user=principal(request)!;return Response.json({user:saveAccountProfile(user,await body(request))},{headers:{'Cache-Control':'no-store'}});}
  catch(error){return Response.json({error:error instanceof z.ZodError?'Use a single-line display name (up to 60 characters) and a public username of 3–30 letters, numbers or underscores.':error instanceof PublicationError?error.message:'Could not save your profile.'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
