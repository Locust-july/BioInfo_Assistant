import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';

// Bounded, read-only ZIP/class parsing. No Java, EXE or script is executed.
export function zipEntry(buffer, name) {
 let end=-1;
 for(let p=buffer.length-22;p>=Math.max(0,buffer.length-65557);p--)if(buffer.readUInt32LE(p)===0x06054b50){end=p;break;}
 if(end<0)throw Error('ZIP directory missing');
 const count=buffer.readUInt16LE(end+10),directoryOffset=buffer.readUInt32LE(end+16);
 const base=end-buffer.readUInt32LE(end+12)-directoryOffset;if(base<0)throw Error('Invalid embedded archive offset');
 let p=base+directoryOffset;
 if(count===65535)throw Error('ZIP64 unsupported');
 for(let i=0;i<count;i++){
  if(buffer.readUInt32LE(p)!==0x02014b50)throw Error('Invalid ZIP directory');
  const method=buffer.readUInt16LE(p+10),size=buffer.readUInt32LE(p+20),expanded=buffer.readUInt32LE(p+24),n=buffer.readUInt16LE(p+28),extra=buffer.readUInt16LE(p+30),comment=buffer.readUInt16LE(p+32),offset=base+buffer.readUInt32LE(p+42);
  if(buffer.subarray(p+46,p+46+n).toString('utf8')===name){
   if(size>1048576||expanded>1048576||buffer.readUInt32LE(offset)!==0x04034b50)throw Error('Entry exceeds safe limits');
   const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28);
   if(start+size>buffer.length)throw Error('Truncated archive');
   const data=buffer.subarray(start,start+size);
   if(method===0)return data;
   if(method===8)return inflateRawSync(data,{maxOutputLength:1048576});
   throw Error('Unsupported ZIP compression');
  }
  p+=46+n+extra+comment;
 }
 throw Error('Required application resource missing: '+name);
}
export function classVersion(buffer, expectedClass) {
 if(buffer.readUInt32BE(0)!==0xcafebabe)throw Error('Invalid class');
 const cp=[];let p=10;
 for(let i=1;i<buffer.readUInt16BE(8);i++){
  const tag=buffer[p++];
  if(tag===1){const length=buffer.readUInt16BE(p);p+=2;cp[i]=buffer.subarray(p,p+length).toString('utf8');p+=length;}
  else if([7,8,16,19,20].includes(tag)){cp[i]={index:buffer.readUInt16BE(p)};p+=2;}
  else if([3,4,9,10,11,12,17,18].includes(tag))p+=4;
  else if([5,6].includes(tag)){p+=8;i++;}
  else if(tag===15)p+=3;
  else throw Error('Unsupported class constant');
 }
 if(cp[cp[buffer.readUInt16BE(p+2)]?.index]!==expectedClass)throw Error('Application class identity mismatch');
 p+=6;const interfaces=buffer.readUInt16BE(p);p+=2+interfaces*2;const fields=buffer.readUInt16BE(p);p+=2;
 for(let i=0;i<fields;i++){
  const name=cp[buffer.readUInt16BE(p+2)],attributes=buffer.readUInt16BE(p+6);p+=8;
  for(let a=0;a<attributes;a++){
   const attr=cp[buffer.readUInt16BE(p)],length=buffer.readUInt32BE(p+2);p+=6;
   if(name==='VERSION'&&attr==='ConstantValue'&&length===2)return cp[cp[buffer.readUInt16BE(p)]?.index];
   p+=length;
  }
 }
 throw Error('VERSION constant unavailable');
}
const suite=new Set(['beast','beauti','treeannotator','logcombiner']);
export async function readApplicationVersion(id, executablePath) {
 const checkedAt=new Date().toISOString();
 if(!suite.has(id)&&id!=='aliview')return {status:'unknown',version:null,checkedAt,reason:'尚无可核验的独立应用版本适配器'};
 const jar=suite.has(id)||path.extname(executablePath).toLowerCase()==='.jar'?executablePath:path.join(path.dirname(executablePath),'app','aliview.jar');
 try{
  if((await stat(jar)).size>128*1024*1024)throw Error('Archive exceeds 128 MiB limit');
  const archive=await readFile(jar);const manifest=zipEntry(archive,'META-INF/MANIFEST.MF').toString('utf8').replace(/\r/g,'');
  const allowed=suite.has(id)?(id==='beauti'?['dr.app.beauti.BeautiApp','dr.app.beast.BeastMain']:['dr.app.beast.BeastMain']):['aliview.AliView'];
  const main=allowed.find(name=>manifest.split('\n').includes('Main-Class: '+name));
  if(!main)throw Error('JAR main-class identity mismatch');
  const entry=suite.has(id)?'dr/app/beast/BeastVersion.class':'version.properties';
  const data=zipEntry(archive,entry);
  const version=suite.has(id)?classVersion(data,'dr/app/beast/BeastVersion'):data.toString('utf8').match(/^version\s*=\s*(\S+)\s*$/m)?.[1];
  if(typeof version!=='string'||!/^\d+\.\d+(?:\.[\w-]+)*$/.test(version))throw Error('Unrecognized application version');
  return {status:'resource_verified',version,source:{type:'application_resource',path:jar,entry,identityEvidence:'manifest Main-Class: '+main},scope:suite.has(id)?'BEAST_suite':'application',checkedAt};
 }catch(e){return {status:'unknown',version:null,source:{type:'application_resource',path:jar},reason:e.code||e.message,checkedAt};}
}
