import {ImageResponse} from 'next/og';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {brandPalette} from '@/lib/brand-identity';
export const alt='CALBOK — Calls fade. Receipts stay.';
export const size={width:1200,height:630};
export const contentType='image/png';
export default async function Image(){
 const original=await readFile(join(process.cwd(),'public/brand/calbok-share.png'));
 return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:brandPalette.forest}}>
  {/* ImageResponse renders HTML image primitives; this is the unchanged owner-supplied artwork. */}
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={'data:image/png;base64,'+original.toString('base64')} width={1200} height={400} alt={alt}/>
 </div>,size);
}
