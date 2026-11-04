import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {callStatus,priceChange} from '../lib/call-presentation';
import {makeCallReview} from '../lib/log-review';
import {safeNext} from '../lib/navigation';
import {CautionNotice} from '../components/caution-notice';
import {TickerDisplay} from '../components/home-ticker';
import {EmailSignIn} from '../components/email-signin';
import Home from '../app/page';
import {SiteShell} from '../components/site-shell';
import type {RecallReview} from '../lib/recall-types';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-design-test-')),'test.sqlite');
process.env.CALBOK_ADMIN_TOKEN='SYNTHETIC_DESIGN_TEST_TOKEN';
const {isOwnerRequest}=await import('../lib/admin-access');
const {createSession}=await import('../lib/auth');

test('homepage and shared navigation focus on viewer and logger journeys without sample calls or owner dashboards',()=>{
 const html=renderToStaticMarkup(createElement(SiteShell,null,Home()));
 for(const path of ['/feed','/log','/my-calls','/signin'])assert.ok(html.includes(`href="${path}"`));
 assert.match(html,/Lock a crypto call before it happens/);assert.match(html,/See who’s actually right/);
 assert.equal((html.match(/class="primary-action"/g)||[]).length,1);
 assert.ok(!html.includes('Integration settings'));assert.ok(!html.includes('Memory write ledger'));assert.ok(!html.includes('HeroReceipt'));assert.ok(!html.includes('clean-call-card'));
 assert.match(html,/Skip to content/);assert.match(html,/Main navigation/);
});

test('empty, unavailable and paused ticker states remain honest and keyboard accessible',()=>{
 const html=renderToStaticMarkup(createElement(TickerDisplay,{calls:[],loading:false,error:false,paused:false,now:0,onPause(){}}));
 assert.match(html,/No public calls yet. Be the first./);assert.match(html,/href="\/log"/);assert.ok(!html.includes('ticker-track'));assert.ok(!html.includes('BTC'));
 const failed=renderToStaticMarkup(createElement(TickerDisplay,{calls:[],loading:false,error:true,paused:false,now:0,onPause(){}}));
 assert.match(failed,/could not be loaded/);assert.ok(!failed.includes('No public calls yet'));
 const css=readFileSync(new URL('../app/simple.css',import.meta.url),'utf8');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/\.ticker-copy\{display:none/);assert.match(css,/\.ticker-viewport:hover \.ticker-track/);assert.match(css,/:focus-within \.ticker-track/);assert.match(css,/animation-play-state:paused/);assert.match(css,/\.ticker-group \.clean-call-card\{[^}]*height:212px/);
 const keyframes=css.match(/@keyframes call-marquee\{(.*?)\}\}/)?.[1]||'';
 assert.ok(keyframes.includes('transform:translateX'));assert.ok(!/\b(left|right|top|width|height):/.test(keyframes));
});

test('plain call results never manufacture a verdict at the deadline',()=>{
 const now=Date.UTC(2026,10,4,12),deadline=new Date(now+12*60000).toISOString();
 assert.equal(callStatus('pending',deadline,now),'Settles in 12m');assert.equal(callStatus('pending',deadline,now+12*60000),'Checking result');
 assert.equal(callStatus('won',deadline,now),'Won');assert.equal(callStatus('lost',deadline,now),'Lost');assert.equal(callStatus('neutral',deadline,now),'Neutral');assert.equal(callStatus('unverified',deadline,now),'Needs review');
 assert.equal(priceChange(null),null);assert.equal(priceChange('-10.00000000'),'-10.00%');
});

test('short-form review formats only explicit user terms, preserves supplied text and remains separate from lock confirmation',()=>{
 const asset={id:'BTC',symbol:'BTC',name:'Bitcoin',provider:'Tatum' as const};
 const fields={caller:'SYNTHETIC TEST',direction:'bearish',horizon:'15m',sourceUrl:'',visibility:'private'};
 const review=makeCallReview({...fields,price:'999',outcome:'won',lockedAt:'yesterday'},asset);
 assert.match(review.text,/BTC will be lower after 15 minutes/);assert.equal(review.visibility,'private');
 for(const key of ['price','outcome','lockedAt','deadline'])assert.ok(!(key in review));
 assert.equal(makeCallReview({...fields,text:'  SYNTHETIC ORIGINAL CALL TEXT  '},asset).text,'SYNTHETIC ORIGINAL CALL TEXT');
 for(const change of [{direction:''},{horizon:''},{caller:''},{sourceUrl:'javascript:alert(1)'}])assert.throws(()=>makeCallReview({...fields,...change},asset));
});

test('email sign-in stays one-field and owner tools require actual owner authentication',()=>{
 const html=renderToStaticMarkup(createElement(EmailSignIn,{next:'/my-calls'}));
 assert.equal((html.match(/<input\b/g)||[]).length,1);assert.match(html,/type="email"/);assert.ok(!html.includes('type="password"'));assert.ok(!html.includes('Owner key'));
 const member=createSession({id:'design-member',role:'user',email:'design@example.test'});
 assert.equal(isOwnerRequest(new Request('https://calbok.example/admin',{headers:{host:'localhost'}})),false);
 assert.equal(isOwnerRequest(new Request('https://calbok.example/admin',{headers:{cookie:'calbok_session='+member}})),false);
 assert.equal(isOwnerRequest(new Request('https://calbok.example/admin',{headers:{authorization:'Bearer SYNTHETIC_DESIGN_TEST_TOKEN'}})),true);
 for(const value of ['https://evil.test','//evil.test','/\\evil.test','/unknown'])assert.equal(safeNext(value),'/my-calls');
 assert.equal(safeNext('/call/CB-example'),'/call/CB-example');assert.equal(safeNext('/log?repeat=CB-example'),'/log?repeat=CB-example');
});

test('clear caution banner still requires all existing verified citation and sample conditions',()=>{
 const review={priority:'caution',contextual:{rate:'20.0',total:5},citedIds:['a','b','c','d','e'],sqlCitation:{rows:Array.from({length:5},(_,i)=>({receiptId:String(i)}))}} as unknown as RecallReview;
 assert.match(renderToStaticMarkup(createElement(CautionNotice,{review})),/role="alert"/);
 assert.equal(renderToStaticMarkup(createElement(CautionNotice,{review:{...review,citedIds:[]}})),'');
 assert.equal(renderToStaticMarkup(createElement(CautionNotice,{review:{...review,contextual:{...review.contextual,rate:'40.0'}}})), '');
});
