import { spawn } from 'node:child_process';

const children=[
  spawn(process.execPath,['server.mjs'],{stdio:'inherit',env:process.env}),
  spawn(process.execPath,['jarvis-bridge.mjs'],{stdio:'inherit',env:process.env})
];

let shuttingDown=false;
const shutdown=code=>{
  if(shuttingDown)return;
  shuttingDown=true;
  for(const child of children) child.kill('SIGTERM');
  setTimeout(()=>process.exit(code),250);
};
for(const child of children) child.on('exit',code=>{if(!shuttingDown && code) shutdown(code);});
process.on('SIGINT',()=>shutdown(0));
process.on('SIGTERM',()=>shutdown(0));
console.log('Judo + Jarvis voice bridge starting…');
