// Local pre-push guard: prints filenames/key names only, never credential values.
import { execFileSync } from 'node:child_process';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const files=execFileSync('git',['diff','--cached','--name-only','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const keys=['TATUM_API_KEY','MEMWAL_PRIVATE_KEY','MEMWAL_ACCOUNT_ID','CALBOK_ADMIN_TOKEN','X_BEARER_TOKEN'];
let failed=false;
for(const file of files){
  if((file.startsWith('.env')&&file!=='.env.example')||file.startsWith('data/')||file.endsWith('.sqlite')){console.error('Private file staged:',file);failed=true;continue;}
  const content=execFileSync('git',['show',`:${file}`],{encoding:'utf8'});
  for(const key of keys){const value=process.env[key];if(value&&value.length>=8&&content.includes(value)){console.error('Configured credential found:',key,'in',file);failed=true;}}
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bsuiprivkey1[a-z0-9]{30,}/.test(content)){console.error('Possible secret found in',file);failed=true;}
}
if(failed)process.exitCode=1;else console.log(`PASS: ${files.length} staged files checked; configured credentials and private data excluded.`);
