import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const key=process.env.TATUM_API_KEY;
if(!key)throw new Error('TATUM_NOT_CONFIGURED');
const headers={'x-api-key':key,'content-type':'application/json'};
const [{SuiGrpcClient},{GrpcTransport},{ChannelCredentials}]=await Promise.all([import('@mysten/sui/grpc'),import('@protobuf-ts/grpc-transport'),import('@grpc/grpc-js')]);
const transport=new GrpcTransport({host:'sui-mainnet-grpc.gateway.tatum.io:443',channelCredentials:ChannelCredentials.createSsl()});
try {
  const client=new SuiGrpcClient({network:'mainnet',transport});
  const {response}=await client.stateService.getCoinInfo({coinType:'0x2::sui::SUI'},{meta:{'x-api-key':key},timeout:15_000});
  console.log('Sui gRPC coin metadata:',response.metadata);
}catch(error){console.log('Sui gRPC diagnostic:',error instanceof Error?error.message.split(key).join('[REDACTED]').slice(0,800):'Unknown failure');}
finally{transport.close();}
const boundary=Math.floor((Date.now()-3600_000)/60_000)*60_000;
const url=new URL('https://api.tatum.io/v4/data/rate/symbol/OHLCV');
url.search=new URLSearchParams({symbol:'BTC',unix:String(boundary),interval:'1m'}).toString();
const response=await fetch(url,{headers,signal:AbortSignal.timeout(15_000)});
const candle=await response.json();
console.log('Pricing status:',response.status,'Requested boundary UTC:',new Date(boundary).toISOString());
console.log('Candle timestamp diagnostics:',{openTime:candle.openTime,closeTime:candle.closeTime,durationMs:candle.closeTime-candle.openTime,offsetMs:candle.openTime-boundary,serverDate:response.headers.get('date')});
