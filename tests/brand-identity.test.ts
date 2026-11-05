import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {brandAssets,brandPalette} from '../lib/brand-identity';
import {BrandMark} from '../components/brand';
import {drawBrandLogo} from '../lib/brand-canvas';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const file=(name:string)=>readFileSync(new URL('../'+name,import.meta.url));

test('site logo, favicon, SVG wrappers and PNG downloads preserve the exact owner-supplied artwork',()=>{
 const logo=file('public/brand/calbok-logo.png'),banner=file('public/brand/calbok-share.png');
 assert.equal(hash(logo),'47af45a0d80380080b54217f84423cb095664d41182b9ebfb1df05e7e6ce4755');
 assert.equal(hash(banner),'4e89a46d1ccbc0adf46235584236f1b3e43ef94b7057e35805dc8f9c687e9ced');
 assert.equal(logo.readUInt32BE(16),400);assert.equal(logo.readUInt32BE(20),400);
 assert.equal(banner.readUInt32BE(16),1500);assert.equal(banner.readUInt32BE(20),500);
 const html=renderToStaticMarkup(createElement(BrandMark));assert.ok(html.includes('href="'+brandAssets.logo+'"'));assert.match(html,/aria-hidden="true"/);assert.ok(!html.includes('currentColor'));assert.ok(!html.includes('--signal'));
 for(const name of ['app/icon.svg','public/brand/calbok-mark.svg','public/brand/calbok-wordmark.svg']){
  const data=file(name).toString().match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)?.[1];assert.ok(data);assert.equal(hash(Buffer.from(data,'base64')),hash(logo));
 }
 const social=file('public/brand/calbok-social.svg').toString().match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)?.[1];assert.ok(social);assert.equal(hash(Buffer.from(social,'base64')),hash(banner));
});

function contrast(a:string,b:string){
 const luminance=(hex:string)=>{const c=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
test('active theme uses the supplied palette with legible buttons, light surfaces and semantic result colors',()=>{
 assert.deepEqual([brandPalette.forest,brandPalette.paper,brandPalette.sage,brandPalette.orange],['#142c25','#f4f2e9','#d5e6bf','#ef7145']);
 assert.ok(contrast(brandPalette.forest,brandPalette.orange)>=4.5);assert.ok(contrast(brandPalette.paper,brandPalette.forest)>=4.5);assert.ok(contrast(brandPalette.link,brandPalette.paper)>=4.5);
 const css=file('app/ocean.css').toString();
 for(const color of [brandPalette.forest,brandPalette.paper,brandPalette.sage,brandPalette.orange])assert.ok(css.includes(color));
 for(const old of ['#0069e9','#0055c4','#005bc7','#001b18','#050706'])assert.ok(!css.includes(old),old);
 assert.match(css,/background:#ef7145; color:#142c25;/);assert.match(css,/\.direction-badge\.bullish/);assert.match(css,/\.direction-badge\.bearish/);assert.match(css,/prefers-reduced-motion/);
});

test('receipt and inbox PNG rendering draws the same original logo and reports an asset failure clearly',async()=>{
 const prior=globalThis.Image;const drawn:unknown[][]=[];
 class LoadedImage {onload:(()=>void)|null=null;onerror:(()=>void)|null=null;private value='';set src(value:string){this.value=value;queueMicrotask(()=>this.onload?.());}get src(){return this.value;}}
 try{
  globalThis.Image=LoadedImage as unknown as typeof Image;
  await drawBrandLogo({drawImage:((...args:unknown[])=>drawn.push(args)) as CanvasRenderingContext2D['drawImage']},76,66,72);
  assert.equal((drawn[0][0] as LoadedImage).src,brandAssets.logo);assert.deepEqual(drawn[0].slice(1),[76,66,72,72]);
  class FailedImage extends LoadedImage {override set src(_value:string){queueMicrotask(()=>this.onerror?.());}}
  globalThis.Image=FailedImage as unknown as typeof Image;
  await assert.rejects(()=>drawBrandLogo({drawImage:()=>undefined},0,0,1),/Could not load the CALBOK logo/);
 }finally{globalThis.Image=prior;}
 for(const name of ['lib/receipt-export.ts','lib/inbox-export.ts']){const code=file(name).toString();assert.match(code,/await drawBrandLogo/);assert.ok(!code.includes('new Path2D'));}
});

test('brand kit packages the original PNGs and matching logo wrappers without changing their bytes',()=>{
 const zip=file('public/brand/calbok-brand-kit.zip'),entries=new Map<string,Buffer>();let at=0;
 while(zip.readUInt32LE(at)===0x04034b50){
  assert.equal(zip.readUInt16LE(at+8),0,'Brand kit uses stored ZIP entries');
  const size=zip.readUInt32LE(at+18),nameLength=zip.readUInt16LE(at+26),extraLength=zip.readUInt16LE(at+28);
  const name=zip.subarray(at+30,at+30+nameLength).toString(),start=at+30+nameLength+extraLength;entries.set(name,zip.subarray(start,start+size));at=start+size;
 }
 for(const name of ['calbok-logo.png','calbok-share.png','calbok-mark.svg','calbok-wordmark.svg','calbok-social.svg'])assert.deepEqual(entries.get(name),file('public/brand/'+name));
 assert.match(entries.get('brand.md')!.toString(),/original supplied artwork|original owner|owner-supplied/i);
});
