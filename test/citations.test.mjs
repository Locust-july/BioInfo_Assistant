import test from 'node:test';
import assert from 'node:assert/strict';
import { exportCitations } from '../src/citations.mjs';
import { listSoftware } from '../src/catalog.mjs';

test('citation bundle deduplicates shared papers and has complete reproducible metadata',()=>{
 const result=exportCitations([{id:'beast',version:'1.8.3'},{id:'beauti',version:'1.8.3'}],'bibtex');
 assert.equal(result.citations.length,1); assert.match(result.text,/@article/); assert.equal(result.status,'ready');
 for(const software of listSoftware()) for(const c of software.citations){
  for(const field of ['title','reference','doi','bibtex','source','metadataSource','checkedAt','scope']) assert.ok(c[field],field);
  assert.match(c.reference,new RegExp(c.doi.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 }
});
test('wrong generations are excluded, unknown versions and missing papers remain explicit',()=>{
 for(const selection of [{id:'beast',version:'2.7.0'},{id:'muscle',version:'5.3'},{id:'raxml',version:'9.0'},{id:'clustalw',version:'1.83'}]){
  const result=exportCitations([selection]);assert.equal(result.bibliographyText,'');assert.match(result.text,/未解决/);assert.equal(result.unresolved.length,1);
 }
 assert.equal(exportCitations([{id:'mafft'}]).status,'review_required');
 assert.equal(exportCitations([{id:'blast'}]).status,'incomplete');
 assert.equal(exportCitations([{id:'simplot'}]).warnings.length,1);
 assert.equal(exportCitations([{id:'unknown'}]).status,'incomplete');
});
