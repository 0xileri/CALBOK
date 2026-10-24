import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const {gmgnGet}=await import('../lib/gmgn');
const from=Math.floor((Date.now()-3600_000)/60_000)*60_000;
const raw=await gmgnGet('/v1/market/token_kline',{chain:'base',address:'0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf',resolution:'1m',from:String(from),to:String(from+120_000)}) as {list?:{time:unknown}[]};
console.log('Requested UTC:',new Date(from).toISOString());
console.log('Candle timestamp diagnostics:',raw.list?.slice(0,3).map(c=>({time:c.time,type:typeof c.time})), 'Response fields:',Object.keys(raw));
