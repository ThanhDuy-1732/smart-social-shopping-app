import { createHmac } from 'node:crypto';
export function totp(secret:string):string {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits=[...secret.replace(/=/g,'')].map(c=>alphabet.indexOf(c).toString(2).padStart(5,'0')).join('');
  const key=Buffer.from((bits.match(/.{8}/g)??[]).map(x=>parseInt(x,2)));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const hash=createHmac('sha1',key).update(counter).digest();
  return ((hash.readUInt32BE(hash[hash.length-1]&15)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
