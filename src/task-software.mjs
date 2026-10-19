import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import path from 'node:path';
import {listSoftware,getSoftware} from './catalog.mjs';
import {inspectSoftware} from './inspect.mjs';
import {discoverSoftware} from './discover.mjs';
import {locations} from './locations.mjs';
import {getMaterials} from './materials.mjs';
import {jsonStore} from './json-store.mjs';
export const taskInputSchema=z.object({summary:z.string().trim().min(1).max(4000),requirements:z.array(z.object({name:z.string().trim().min(1).max(200),softwareId:z.string().max(80).optional(),purpose:z.string().max(1000).optional(),planningState:z.enum(['suggested','planned']).default('planned'),knownInfo:z.object({executablePaths:z.array(z.string().max(4096)).max(10).default([]),reportedVersion:z.string().max(80).optional(),note:z.string().max(1000).optional()}).optional()}).strict()).min(1).max(50)}).strict();
const store=jsonStore('task-software');
export function resolveSoftware(name,id){
 const all=listSoftware();
 if(id){try{return {status:'resolved',softwareId:getSoftware(id).id,method:'explicit_id',alternatives:[]};}catch{return {status:'unknown',softwareId:null,requestedId:id,alternatives:[]};}}
 const q=name.trim().toLowerCase();
 const exact=all.filter(s=>[s.id,s.name,...s.aliases].some(n=>n.toLowerCase()===q));
 if(exact.length===1)return {status:'resolved',softwareId:exact[0].id,method:'exact_name_or_alias',alternatives:[]};
 const partial=exact.length?exact:all.filter(s=>[s.id,s.name,...s.aliases].some(n=>n.toLowerCase().includes(q)||q.includes(n.toLowerCase())));
 return {status:partial.length?'ambiguous':'unknown',softwareId:null,alternatives:partial.map(s=>({id:s.id,name:s.name})),reason:'未进行模糊自动认定；请明确软件及代际'};
}
export function createTaskSoftware(input,repository=store){
 const data=taskInputSchema.parse(input);const taskId=randomUUID();
 repository.put(taskId,{taskId,summary:data.summary,createdAt:new Date().toISOString(),contextSource:'explicit_calling_ai_input',chatRead:false,
  requirements:data.requirements.map(r=>({...r,requirementId:randomUUID(),resolution:resolveSoftware(r.name,r.softwareId),candidates:[],selectedInstallationId:null,usage:[]}))});
 return getTaskSoftware(taskId,repository);
}
export function getTaskSoftware(taskId,repository=store){
 const task=repository.get(taskId);
 task.requirements=task.requirements.map(r=>{
  const selected=r.candidates.find(c=>c.installationId===r.selectedInstallationId);
  const confirmed=r.candidates.filter(c=>['metadata_match','application_resource_match'].includes(c.identity));
  return {...r,localState:r.resolution.status!=='resolved'?'unresolved':r.lastDetectionAt?confirmed.length?'confirmed_local':r.candidates.length?'candidate_only':'not_found':'not_checked',
   selectionState:selected?'selected':r.candidates.length>1?'selection_required':'not_selected',selectedInstallation:selected||null,
   actualUsageState:r.usage.length?'explicitly_reported_used':'not_recorded',
   materials:getMaterials({id:r.resolution.softwareId||undefined,name:r.name,version:selected?.version||undefined})};
 });
 task.attention=task.requirements.flatMap(r=>[...(r.resolution.status!=='resolved'?[{requirementId:r.requirementId,type:r.resolution.status,name:r.name}]:[]),...(r.localState==='not_found'?[{requirementId:r.requirementId,type:'missing_software'}]:[]),...(r.selectionState!=='selected'?[{requirementId:r.requirementId,type:'select_installation'}]:[]),...(r.selectedInstallation&&!['metadata_match','application_resource_match'].includes(r.selectedInstallation.identity)?[{requirementId:r.requirementId,type:'identity_unconfirmed'}]:[]),...(r.selectedInstallation&&!r.selectedInstallation.version?[{requirementId:r.requirementId,type:'application_version_unknown'}]:[]),...(r.materials.missing.length?[{requirementId:r.requirementId,type:'materials_missing',items:r.materials.missing}]:[]),...(r.materials.warnings.length?[{requirementId:r.requirementId,type:'materials_review',reasons:r.materials.warnings}]:[])]);
 return task;
}
export function resolveTaskRequirement(taskId,requirementId,softwareId,repository=store){
 getSoftware(softwareId);const task=repository.get(taskId);const r=task.requirements.find(r=>r.requirementId===requirementId);if(!r)throw Error('任务软件条目不存在');
 r.resolution={status:'resolved',softwareId,method:'explicit_resolution',alternatives:[]};r.candidates=[];r.selectedInstallationId=null;r.lastDetectionAt=null;
 repository.put(taskId,task);return getTaskSoftware(taskId,repository);
}
export async function inspectTaskSoftware({taskId,requirementIds,paths=[],roots=[]},options={}){
 const repository=options.repository||store;const task=repository.get(taskId);
 if(requirementIds?.some(id=>!task.requirements.some(r=>r.requirementId===id)))throw Error('任务软件条目不存在');
 if(paths.some(p=>!task.requirements.some(r=>r.requirementId===p.requirementId)))throw Error('路径不属于该任务条目');
 const requested=task.requirements.filter(r=>!requirementIds||requirementIds.includes(r.requirementId));
 const ids=requested.map(r=>r.resolution.softwareId).filter(Boolean);
 const discovered=roots.length?await (options.discover||discoverSoftware)(roots,{softwareIds:ids}):null;
 for(const r of requested){
  if(r.resolution.status!=='resolved')continue;
  const id=r.resolution.softwareId;
  const known=[...(r.knownInfo?.executablePaths||[]),...paths.filter(p=>p.requirementId===r.requirementId).flatMap(p=>p.executablePaths),...(options.knownLocations??locations.list()).filter(l=>l.kind==='software'&&l.softwareId===id).map(l=>l.path)];
  const candidates=new Map();const errors=[];if(new Set(known).size>20)errors.push({status:'search_limit',reason:'已知路径超过本次20条检查上限；请按需指定目标路径'});
  const add=c=>{if(!c.executablePath)return;const installationId=createHash('sha256').update(id+'|'+path.win32.normalize(c.executablePath).toLowerCase()).digest('hex');candidates.set(installationId,{...c,installationId});};
  for(const c of discovered?.candidates.filter(c=>c.id===id)||[])add(c);
  for(const file of [...new Set(known)].slice(0,20)){
   try{const result=await (options.inspect||inspectSoftware)(id,file);if(result.status==='found'||result.status==='metadata_unavailable')add(result);else errors.push({path:file,status:result.status,reason:result.reason});}
   catch(e){errors.push({path:file,reason:e.message});}
  }
  if(!roots.length || !candidates.size){const result=await (options.inspect||inspectSoftware)(id,undefined,{collectAll:true});for(const c of result.candidates||[])add(c);if(!candidates.size)errors.push({status:result.status,reason:result.reason});}
  r.candidates=[...candidates.values()];r.detectionErrors=errors;r.lastDetectionAt=new Date().toISOString();
  if(!r.candidates.some(c=>c.installationId===r.selectedInstallationId))r.selectedInstallationId=null;
 }
 repository.put(taskId,task);return {...getTaskSoftware(taskId,repository),discoverySummary:discovered?{warnings:discovered.warnings,truncated:discovered.truncated,roots}:null};
}
export function selectTaskInstallation(taskId,requirementId,installationId,repository=store){
 const task=repository.get(taskId);const r=task.requirements.find(r=>r.requirementId===requirementId);
 if(!r||!r.candidates.some(c=>c.installationId===installationId))throw Error('请先检测并选择该条目的候选安装');
 r.selectedInstallationId=installationId;r.selectedAt=new Date().toISOString();repository.put(taskId,task);return getTaskSoftware(taskId,repository);
}
export function recordTaskUsage({taskId,requirementId,note,reportedBy},repository=store){
 const task=repository.get(taskId);const r=task.requirements.find(r=>r.requirementId===requirementId);if(!r)throw Error('任务软件条目不存在');
 const selected=r.candidates.find(c=>c.installationId===r.selectedInstallationId);if(!selected)throw Error('实际使用记录需要先选择安装');
 r.usage.push({softwareId:r.resolution.softwareId,installationId:selected.installationId,path:selected.executablePath,version:selected.version,reportedBy,note,recordedAt:new Date().toISOString(),verification:'explicit_report_not_execution_verified'});
 repository.put(taskId,task);return getTaskSoftware(taskId,repository);
}
export function taskCitationSelections(taskId,requirementIds,repository=store){
 const task=getTaskSoftware(taskId,repository);const selections=[],unresolved=[];
 for(const requirementId of requirementIds){
  const r=task.requirements.find(r=>r.requirementId===requirementId);if(!r)throw Error('任务软件条目不存在');
  if(!r.selectedInstallation||!['metadata_match','application_resource_match'].includes(r.selectedInstallation.identity)||!r.selectedInstallation.version){unresolved.push({requirementId,name:r.name,reason:'请先选择身份已确认、应用版本有证据的安装'});continue;}
  selections.push({id:r.resolution.softwareId,version:r.selectedInstallation.version,versionSource:r.selectedInstallation.applicationVersion?.source,executablePath:r.selectedInstallation.executablePath,checkedAt:r.selectedInstallation.checkedAt});
 }
 return {selections,unresolved};
}
