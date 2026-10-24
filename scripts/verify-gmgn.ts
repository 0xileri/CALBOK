import nextEnv from '@next/env';
import {writeFileSync} from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
const {searchGmgn,gmgnCandles}=await import('../lib/gmgn');
const {boundaryCandle}=await import('../lib/domain');
const {parseGmgnAssetId}=await import('../lib/assets');
if(!process.env.GMGN_API_KEY || process.env.GMGN_API_KEY==='your_actual_key'){
  console.error('BLOCKED: save the real GMGN_API_KEY inside .env.local (not as a PowerShell command). No key values printed.');process.exitCode=1;
}else{
  try{
    const assets=await searchGmgn('VVV','base');
    console.log(`GMGN authenticated search: PASS. ${assets.length} Base candidates; first 5 (untrusted provider metadata):`,assets.slice(0,5));
    const requestedId=process.argv[2];
    if(requestedId){
      const asset=assets.find(a=>a.id===requestedId),token=parseGmgnAssetId(requestedId);
      if(!asset||!token)throw new Error('Choose an exact candidate returned by this search. No first-match selection is assumed.');
      const boundary=Math.floor((Date.now()-3600_000)/60_000)*60_000;
      const candle=boundaryCandle(await gmgnCandles(token.chain,token.address,boundary),boundary,Date.now());
      if(!candle)throw new Error('No eligible finalized 1m candle at the requested boundary.');
      const evidence={provider:'GMGN',checkedAt:new Date().toISOString(),asset,requestedBoundary:boundary,candle};
      writeFileSync('docs/evidence/gmgn-verification.json',JSON.stringify(evidence,null,2)+'\n');
      console.log('GMGN timestamp-validated candle: PASS. Public evidence saved; no memory or prediction written.');
    }else console.log('Search only. Verify a specific candidate by passing its full gmgn:chain:address ID.');
  }catch(error){console.error(error instanceof Error?error.message:'GMGN verification failed');process.exitCode=1;}
}
