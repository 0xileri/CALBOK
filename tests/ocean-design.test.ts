import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {WireframeLandscape} from '../components/wireframe-landscape';
import {EmailSignIn} from '../components/email-signin';
import {SiteShell} from '../components/site-shell';

test('reference-inspired sign-in retains one labeled email field and the existing passwordless action',()=>{
 const html=renderToStaticMarkup(createElement(EmailSignIn,{next:'/my-calls'}));
 assert.match(html,/Log in to your account/);assert.match(html,/Send me a code/);assert.match(html,/one-time sign-in code/);
 assert.equal((html.match(/<input\b/g)||[]).length,1);assert.match(html,/type="email"/);assert.match(html,/autoComplete="email"/i);
 assert.ok(!html.includes('type="password"'));assert.ok(!html.includes('Google'));assert.ok(!html.includes('DigitalOcean'));
 assert.match(html,/href="\/feed"/);assert.match(html,/auth-explore/);
});

test('decorative wireframe is deterministic, hidden from assistive technology, and contains no invented market data',()=>{
 const html=renderToStaticMarkup(createElement(WireframeLandscape));
 assert.equal(html,renderToStaticMarkup(createElement(WireframeLandscape)));
 assert.match(html,/aria-hidden="true"/);assert.match(html,/focusable="false"/);assert.equal((html.match(/<path\b/g)||[]).length,109);
 for(const forbidden of ['BTC','Won','Lost','<text','<script','<animate','http:','https:'])assert.ok(!html.includes(forbidden));
});

test('sign-in-inspired theme keeps CALBOK navigation and responsive white panels without a dashboard sidebar',()=>{
 const html=renderToStaticMarkup(createElement(SiteShell,null,createElement('main',null,'TEST CONTENT')));
 assert.match(html,/ocean-site/);assert.match(html,/landscape-background/);assert.match(html,/Main navigation/);assert.match(html,/Skip to content/);
 for(const path of ['/feed','/log','/my-calls','/signin'])assert.ok(html.includes('href="'+path+'"'));
 assert.ok(!html.includes('console-sidebar'));assert.ok(!html.includes('DigitalOcean'));
 const css=readFileSync(new URL('../app/ocean.css',import.meta.url),'utf8');
 for(const rule of ['background:#001b18','background:#050706','font-family:Georgia','max-width:480px','background:white','@media(max-width:520px)','prefers-reduced-motion:reduce','pointer-events:none'])assert.ok(css.includes(rule),rule);
});
