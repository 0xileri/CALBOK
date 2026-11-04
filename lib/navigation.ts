export function safeNext(value:unknown){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))return '/my-calls';
 try{const url=new URL(value,'https://calbok.local');return url.origin==='https://calbok.local'&&/^\/(log|my-calls|account|admin|call\/CB-[a-zA-Z0-9-]{1,100})\/?$/.test(url.pathname)?url.pathname+url.search:'/my-calls';}catch{return '/my-calls';}
}
