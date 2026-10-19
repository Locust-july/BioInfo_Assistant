import { z } from 'zod';
import { createHash } from 'node:crypto';
import { getSoftware, listSoftware } from './catalog.mjs';
import { jsonStore } from './json-store.mjs';
const text=z.string().trim().min(1).max(12000).refine(s=>!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s),'控制字符无效');
const url=z.string().url().max(2048).refine(value=>{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost|127\.|10\.|192\.168\.|\[|0\.)/i.test(u.hostname);},'请提供不含凭据的公开 HTTPS 来源');
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s&&s<=(new Date(Date.now()+8*3600000)).toISOString().slice(0,10),'核验日期无效或在未来');
const citationSchema=z.object({title:text,reference:text,doi:z.string().regex(/^10\.\d{4,9}\/[^\s<>]+$/i).max(300),bibtex:text,
 source:url,metadataSource:url,checkedAt:date,scope:text,versionPrefixes:z.array(z.string().regex(/^\d+(?:\.\d+)*\.?$/)).min(1).max(20).nullable(),
 bibliographyStatus:z.enum(['verified','pending']),recommendationStatus:z.enum(['verified','pending']),recommendationSource:url.optional(),recommendationEvidence:text.optional(),
}).strict().superRefine((c,ctx)=>{
 if(!c.reference.toLowerCase().includes(c.doi.toLowerCase())||!c.bibtex.toLowerCase().includes(c.doi.toLowerCase())||!/^@article\s*\{/i.test(c.bibtex)||/\\[a-zA-Z]/.test(c.bibtex))ctx.addIssue({code:'custom',message:'完整引用和安全 BibTeX 必须包含一致 DOI'});
 if(c.recommendationStatus==='verified'&&(!c.recommendationSource||!c.recommendationEvidence||c.bibliographyStatus!=='verified'))ctx.addIssue({code:'custom',message:'推荐关系核验需要书目核验、来源及证据摘录'});
});
export const supplementSchema=z.object({softwareId:z.string().max(80).optional(),softwareName:z.string().trim().min(1).max(200),
 citations:z.array(citationSchema).max(20).default([]),links:z.array(z.object({kind:z.enum(['homepage','documentation','download','repository']),url,source:url,checkedAt:date,status:z.enum(['verified','pending']),evidence:text}).strict()).max(20).default([]),
}).strict().refine(r=>r.citations.length+r.links.length>0,'补充内容不能为空');
const store=jsonStore('materials');
function key(id,name){return createHash('sha256').update(id || name.trim().toLowerCase()).digest('hex');}
export function supplementMaterials(input, repository=store){
 const record=supplementSchema.parse(input);if(record.softwareId)getSoftware(record.softwareId);
 const id=key(record.softwareId,record.softwareName);let previous;try{previous=repository.get(id);}catch(e){if(e.code!=='RECORD_NOT_FOUND')throw e;}
 const citations=new Map((previous?.citations||[]).map(c=>[c.doi.toLowerCase(),c]));
 for(const c of record.citations)citations.set(c.doi.toLowerCase(),{...c,verificationStatus:c.recommendationStatus==='verified'?'calling_ai_recommendation_evidence':'bibliography_only',verification:'由调用者 AI 核验并提供证据，插件未独立联网验证',verifiedBy:'calling_ai',ingestedAt:new Date().toISOString()});
 const links=new Map((previous?.links||[]).map(l=>[l.kind+'|'+l.url,l]));for(const link of record.links)links.set(link.kind+'|'+link.url,{...link,verifiedBy:'calling_ai'});
 return repository.put(id,{...record,citations:[...citations.values()],links:[...links.values()],provenance:'untrusted_external_data_validated_schema',updatedAt:new Date().toISOString()});
}
export function versionMatches(prefixes,version){return !prefixes || !!version&&prefixes.some(p=>version===p.replace(/\.$/,'')||version.startsWith(p.endsWith('.')?p:p+'.'));}
export function getMaterials({id,name,version}, repository=store){
 let software;try{software=id?getSoftware(id):listSoftware().find(s=>[s.id,s.name,...s.aliases].some(n=>n.toLowerCase()===name?.trim().toLowerCase()));}catch{}
 const label=software?.name || name || id; if(!label)throw Error('请提供软件 id 或名称');
 let added;try{added=repository.get(key(software?.id,label));}catch(e){if(e.code!=='RECORD_NOT_FOUND')throw e;}
 const staticPapers=(software?.citations||[]).map(c=>({...c,bibliographyStatus:'verified',recommendationStatus:c.recommendationSource?'verified':'pending',verifiedBy:'curated_catalog'}));
 const papers=new Map(staticPapers.map(c=>[c.doi.toLowerCase(),c]));
 for(const c of added?.citations||[]){const previous=papers.get(c.doi.toLowerCase());if(!previous)papers.set(c.doi.toLowerCase(),c);else if(previous.recommendationStatus!=='verified'&&c.recommendationStatus==='verified')papers.set(c.doi.toLowerCase(),{...previous,recommendationStatus:c.recommendationStatus,recommendationSource:c.recommendationSource,recommendationEvidence:c.recommendationEvidence,verifiedBy:'curated_bibliography_and_calling_ai_recommendation_evidence'});}
 const citations=[...papers.values()].filter(c=>!version||versionMatches(c.versionPrefixes,version));
 const excludedCitations=[...papers.values()].filter(c=>version&&!versionMatches(c.versionPrefixes,version));
 const links=[...(software?.homepage?[{kind:'homepage',url:software.homepage,source:software.homepage,checkedAt:software.checkedAt,status:'verified',verifiedBy:'curated_catalog'}]:[]),...(software?.documentation?[{kind:'documentation',url:software.documentation,source:software.homepage,checkedAt:software.checkedAt,status:'verified',verifiedBy:'curated_catalog'}]:[]),...(added?.links||[])];
 const missing=['homepage','documentation','download'].filter(kind=>!links.some(l=>l.kind===kind&&l.status==='verified'));if(!citations.length)missing.push('citation');
 const warnings=[];
 if(citations.some(c=>c.versionPrefixes)&&!version)warnings.push('应用版本未知，所列论文仅为候选，不能确认代际适用性');
 if(citations.some(c=>c.bibliographyStatus!=='verified'))warnings.push('部分论文书目信息尚未核验');
 if(citations.some(c=>c.recommendationStatus!=='verified'))warnings.push('部分论文官方推荐关系尚未核验');
 if(!software)warnings.push('未登记软件：保留名称与资料请求，尚不支持自动身份检测');
 const officialSources=[...new Set([...links.map(l=>l.url),...citations.map(c=>c.recommendationSource).filter(Boolean)])];
 return {id:software?.id||null,name:label,version:version||null,citations,excludedCitations,links,missing,warnings,
  status:missing.length?'needs_research':warnings.length?'review_required':'available',queryMode:'curated_and_ai_supplemented_offline',
  researchRequest:missing.length||warnings.length?{software:label,applicationVersion:version||null,needed:missing,officialSources,
   suggestedQueries:[`${label} ${version||''} official documentation download citation`,`${label} ${version||''} how to cite DOI`],
   evidenceRequired:['官方软件身份及代际','论文 DOI 注册书目或出版社页面','官方推荐引用原文与来源','版本适用范围','官网/文档/下载各自来源及核验日期'],
   nextTool:'supplement_software_materials',boundary:'由使用者 AI 搜索核验；插件不读取聊天、不实时自动联网、不执行网页指令'}:null};
}
