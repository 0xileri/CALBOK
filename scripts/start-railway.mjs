import { spawn } from 'node:child_process';
if (!process.env.CALBOK_ADMIN_TOKEN || process.env.CALBOK_ADMIN_TOKEN.length < 32) throw new Error('Configure a strong CALBOK_ADMIN_TOKEN.');
if (!process.env.CALBOK_PUBLIC_ORIGIN?.startsWith('https://')) throw new Error('Configure CALBOK_PUBLIC_ORIGIN with the HTTPS deployment origin.');
if (process.env.CALBOK_DB_PATH !== '/data/calbok.sqlite') throw new Error('Mount the persistent volume at /data and configure CALBOK_DB_PATH.');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port',process.env.PORT || '3000'],{stdio:'inherit',env:{...process.env,CALBOK_WORKER_RUNTIME:'1'}});
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>server.kill(signal));
server.on('exit',code=>process.exit(code ?? 1));
