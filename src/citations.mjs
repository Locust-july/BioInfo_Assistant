import {getMaterials} from './materials.mjs';
export function renderCitationExport(result){
 const prefix=result.format==='bibtex'?'% ':'';
 const notices=[...result.warnings.map(w=>'待确认：'+(w.id||w.name||'')+' '+w.reason),...result.unresolved.map(w=>'未解决：'+(w.id||w.name||w.requirementId||'')+' '+w.reason)];
 return [result.bibliographyText,notices.length?notices.map(n=>prefix+n).join('\n'):''].filter(Boolean).join('\n\n');
}
export function exportCitations(selections,format='reference'){
 if(!['reference','bibtex','doi'].includes(format))throw Error('不支持的引用格式');
 if(!Array.isArray(selections)||!selections.length||selections.length>50)throw Error('请选择 1–50 个明确需要引用的软件');
 const papers=new Map(),warnings=[],unresolved=[],researchRequests=[];
 for(const {id,name,version,doi} of selections){
  const material=getMaterials({id,name,version});
  for(const reason of material.warnings)warnings.push({id:material.id,name:material.name,reason});
  let added=false;
  for(const c of material.citations){
   if(doi&&doi.toLowerCase()!==c.doi.toLowerCase())continue;
   if(c.bibliographyStatus!=='verified'){warnings.push({id,name:material.name,reason:'论文书目尚未核验，未纳入导出：'+c.title});continue;}
   papers.set(c.doi.toLowerCase(),c);added=true;
  }
  if(!added)unresolved.push({id:material.id,name:material.name,version:version||null,reason:'未登记匹配该软件/版本的已核验引用，不替代为其他代际论文'});
  if(material.researchRequest)researchRequests.push(material.researchRequest);
 }
 const citations=[...papers.values()];const result={format,selectionEvidence:selections.map(s=>({id:s.id,name:s.name,version:s.version||null,versionSource:s.versionSource||'caller_provided_unverified',executablePath:s.executablePath,checkedAt:s.checkedAt})),citations,warnings,unresolved,researchRequests,
  bibliographyText:citations.map(c=>format==='doi'?c.doi:c[format]).join('\n\n'),
  status:unresolved.length?'incomplete':warnings.length?'review_required':'ready',
  scope:'明确选择的软件引用；版本为调用者提供值或任务已选安装快照；不自动认定已实际使用，具体方法可能需要追加引用'};
 result.text=renderCitationExport(result);return result;
}
