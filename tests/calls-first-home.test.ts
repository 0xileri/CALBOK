import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {safeSourceUrl,sourceLabel} from '../lib/source-links';
import {claimSchema} from '../lib/domain';
import {tickerEvents,tickerRows,animatedCount} from '../lib/ticker-updates';
import {SourceLink} from '../components/source-link';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-home-')),'test.sqlite');
process.env.CALBOK_ADMIN_TOKEN='SYNTHETIC_HOME_TEST_ONLY';
const {capture,listReceipts}=await import('../lib/db');
const {saveAccountProfile}=await import('../lib/account-profile');
const {publicHomeData}=await import('../lib/public-feed');
const {default:Home}=await import('../app/page');
const claim={caller:'@SyntheticTest',asset:'BTC',direction:'bullish' as const,horizon:'15m' as const,text:'SYNTHETIC TEST CALL, NOT A REAL CALL',sourceUrl:'https://x.com/SyntheticTest/status/123'};

test('source links accept only safe HTTP(S), reject executable or credential-bearing URLs, and never render unsafe anchors',()=>{
 for(const sourceUrl of ['javascript:alert(1)','data:text/html,<script>','ftp://example.test','https://user:password@example.test','https://example.test/?token=PRIVATE','https://example.test/#api_key=PRIVATE','https://example.test/?email=private%40example.test','https://example.test/\nunsafe']){
  assert.equal(safeSourceUrl(sourceUrl),null,sourceUrl);assert.equal(claimSchema.safeParse({...claim,sourceUrl}).success,false,sourceUrl);
  const html=renderToStaticMarkup(createElement(SourceLink,{source:sourceUrl}));assert.match(html,/No source link/);assert.ok(!html.includes('<a'));
 }
 for(const sourceUrl of ['http://example.test/post','https://x.com/CryptoKaleo/status/123'])assert.equal(claimSchema.safeParse({...claim,sourceUrl}).success,true);
 const html=renderToStaticMarkup(createElement(SourceLink,{source:'https://x.com/CryptoKaleo/status/123'}));
 assert.match(html,/View original post/);assert.match(html,/x.com\/CryptoKaleo/);assert.match(html,/target="_blank"/);assert.match(html,/rel="noopener noreferrer nofollow"/);
 assert.equal(sourceLabel('https://www.twitter.com/CryptoKaleo/status/123'),'twitter.com/CryptoKaleo');assert.equal(sourceLabel('https://example.test/a'),'example.test');
 assert.match(renderToStaticMarkup(createElement(SourceLink,{source:''})),/No source link/);
});

test('homepage server-renders exactly the first 24 actual public calls, excludes private records, and has no browser-fetch loading gap',()=>{
 saveAccountProfile({id:'operator',role:'operator',email:null},{displayName:'Synthetic test',publicHandle:'synthetic_test'});
 const ids=Array.from({length:25},(_,i)=>capture({...claim,text:claim.text+' '+i},'operator',undefined,undefined,undefined,false,undefined,'public'));
 const privateId=capture({...claim,text:'PRIVATE CALL MUST NOT LEAK'},'operator');
 const data=publicHomeData();assert.equal(data.calls.length,24);assert.deepEqual(data.stats,{logged:25,settled:0,memories:0});
 const html=renderToStaticMarkup(Home());
 for(const call of data.calls){assert.ok(ids.includes(call.id));assert.ok(html.includes('/call/'+call.id));assert.equal(call.source_url,claim.sourceUrl);}
 assert.ok(!html.includes(privateId));assert.ok(!html.includes('PRIVATE CALL MUST NOT LEAK'));assert.ok(!html.includes('Loading live calls'));
 assert.ok(html.indexOf('hero-call-rows')<html.indexOf('hero-copy'));assert.match(html,/row-0/);assert.match(html,/row-1/);assert.match(html,/row-2/);assert.match(html,/Calls logged/);assert.match(html,/Walrus memories/);
 assert.equal(listReceipts().length,26,'Rendering never creates calls or provider jobs');
 const rows=tickerRows(data.calls);assert.equal(rows.length,3);assert.equal(new Set(rows.flat().map(c=>c.id)).size,24);assert.equal(rows.flat().length,24);
 assert.deepEqual(tickerRows([]),[]);assert.equal(tickerRows(data.calls.slice(0,1)).flat().length,1);
});

test('arrival and result flashes require actual response changes; count-up stays within checked totals',()=>{
 const call=publicHomeData().calls[0];
 assert.deepEqual(tickerEvents([call],[call]),{});
 assert.deepEqual(tickerEvents([call],[{...call,deadline:'2000-01-01T00:00:00Z'}]),{},'An expired clock cannot invent a result flash');
 assert.deepEqual(tickerEvents([call],[{...call,outcome:'won',returnPct:'1.00000000'}]),{[call.id]:'won'});
 assert.deepEqual(tickerEvents([call],[{...call,outcome:'lost',returnPct:'-1.00000000'}]),{[call.id]:'lost'});
 assert.deepEqual(tickerEvents([],[call]),{[call.id]:'new'});
 assert.equal(animatedCount(20,25,0),20);assert.equal(animatedCount(20,25,1),25);assert.equal(animatedCount(25,20,2),20);
 const css=readFileSync(new URL('../app/call-hero.css',import.meta.url),'utf8');
 for(const selector of ['hero-slide-left','hero-slide-right','.row-1 .marquee-track','.row-2 .marquee-track','mask-image:linear-gradient','.marquee-row:hover .marquee-track','.marquee-row.is-touched','prefers-reduced-motion:reduce','display:contents!important','.ticker-copy{display:none!important}','event-won','event-lost'])assert.ok(css.includes(selector),selector);
 assert.match(css,/@keyframes hero-slide-left\{from\{transform:translateX\(0\)\}to\{transform:translateX\(-50%\)\}/);
});
