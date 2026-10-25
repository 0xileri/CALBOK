import {z} from 'zod';
import {authorize,originGuard,body} from '@/lib/http';
import {principal} from '@/lib/auth';
import {readReceiptNote,saveReceiptNote} from '@/lib/receipt-notes';
export const runtime='nodejs';
const idSchema=z.string().regex(/^CB-[a-zA-Z0-9-]{1,100}$/);
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){const denied=authorize(request);if(denied)return denied;const id=idSchema.safeParse(new URL(request.url).searchParams.get('id'));if(!id.success)return Response.json({error:'Invalid receipt ID.'},{status:400,headers});const note=readReceiptNote(id.data,principal(request)!.id);return note?Response.json({note},{headers}):Response.json({error:'Receipt not found in your journal.'},{status:404,headers});}
export async function PUT(request:Request){const origin=originGuard(request,true);if(origin)return origin;const denied=authorize(request);if(denied)return denied;try{const input=z.object({id:idSchema,text:z.string().max(2000),version:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-1)}).strict().parse(await body(request));return Response.json({note:saveReceiptNote(input.id,principal(request)!.id,input.text,input.version)},{headers});}catch(error){const message=error instanceof Error?error.message:'';const conflict=message==='NOTE_CONFLICT',missing=message==='NOTE_NOT_FOUND';return Response.json({error:conflict?'This note changed in another browser. Copy your unsaved text before closing and reopening this receipt.':missing?'Receipt not found in your journal.':'Could not save note. Use at most 2,000 characters.'},{status:conflict?409:missing?404:400,headers});}}
