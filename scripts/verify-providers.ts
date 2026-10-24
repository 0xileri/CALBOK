import nextEnv from '@next/env';
import {mkdirSync,writeFileSync} from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
const evidence:Record<string,unknown>={verifiedAt:new Date().toISOString()};
const { configuration, suiMetadata, priceCandle, memoryClient } = await import('../lib/providers');
const { boundaryCandle } = await import('../lib/domain');
console.log('Configuration (no secrets):',configuration());
if(!configuration().tatum) {console.error('BLOCKED: configure TATUM_API_KEY. No live evidence recorded.');process.exitCode=1;}
else {
  try {
    console.log('Checking Tatum Sui Mainnet coin metadata...');
    evidence.sui=await suiMetadata();console.log('Sui evidence:',evidence.sui);
  }catch(error){console.error('Tatum Sui metadata FAILED:',error instanceof Error?error.message:'Provider verification failed');process.exitCode=1;}
  try {
    console.log('Checking Tatum BTC historical candle...');
    const boundary=Math.floor((Date.now()-3600_000)/60_000)*60_000;
    const candle=await priceCandle('BTC',boundary);
    if(!boundaryCandle([candle],boundary,Date.now()))throw new Error('Candle boundary validation failed');
    console.log('Validated BTC candle:',candle);
    evidence.pricing={asset:'BTC',provider:'Tatum',interval:'1m',requestedBoundary:boundary,candle};
  }catch(error){console.error('Tatum BTC pricing FAILED:',error instanceof Error?error.message:'Provider verification failed');process.exitCode=1;}
}
if(configuration().walrus && configuration().mainnet) {
  try {
    console.log('Checking Walrus authenticated recall (no memory writes)...');
    const client=await memoryClient('calbok-connection-check');
    await client.recall({query:'CALBOK connection verification',limit:1,namespace:'calbok-connection-check'});
    console.log('Walrus authenticated recall: PASS. No private memory content printed.');
    evidence.walrus={authenticatedRecall:true,memoryWritesSubmitted:0};
  }catch{console.error('Walrus authenticated recall FAILED. Account, delegate authorization, relayer, and runtime compatibility need verification. No memory content or credentials printed.');process.exitCode=1;}
}else{console.log('Walrus authenticated recall: SKIPPED (Mainnet credentials not configured).');}
console.log('No memory writes were submitted. Completed Mainnet writes require eligible settled receipts.');
mkdirSync('docs/evidence',{recursive:true});
writeFileSync('docs/evidence/provider-verification.json',JSON.stringify(evidence,null,2)+'\n');
