import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import path from 'node:path';
import {jsonStore} from '../src/json-store.mjs';
import {createTaskSoftware,getTaskSoftware,inspectTaskSoftware,selectTaskInstallation,recordTaskUsage,taskCitationSelections} from '../src/task-software.mjs';
test('task input preserves unknown/ambiguous names, installation selection and explicit usage are separate',async()=>{
 mkdirSync('runtime',{recursive:true});const root=mkdtempSync(path.resolve('runtime','task-test-'));try{
 const repository=jsonStore('tasks',root);
 const task=createTaskSoftware({summary:'Bayesian study',requirements:[{name:'BEAST',knownInfo:{executablePaths:['D:/tools/old/beast.exe','D:/tools/new/beast.exe']}},{name:'BEAST 2'},{name:'Unknown laboratory software'},{name:'MAFFT',planningState:'suggested'}]},repository);
 assert.equal(task.chatRead,false);assert.equal(task.requirements[1].resolution.status,'ambiguous');assert.equal(task.requirements[2].resolution.status,'unknown');
 const detected=await inspectTaskSoftware({taskId:task.taskId},{repository,knownLocations:[],inspect:async(id,file)=>file?{id,executablePath:file,status:'found',identity:'metadata_match',version:file.includes('old')?'1.8.3':'1.10.4',applicationVersion:{source:{type:'application_resource'}}}:{status:'not_found',candidates:[],reason:'fixture absent'}});
 const beast=detected.requirements[0];assert.equal(beast.candidates.length,2);assert.equal(beast.selectionState,'selection_required');assert.equal(beast.actualUsageState,'not_recorded');assert.equal(detected.requirements[3].localState,'not_found');
 const selected=selectTaskInstallation(task.taskId,beast.requirementId,beast.candidates[0].installationId,repository);
 assert.equal(selected.requirements[0].selectedInstallation.version,'1.8.3');assert.equal(selected.requirements[0].usage.length,0);
 assert.equal(taskCitationSelections(task.taskId,[beast.requirementId],repository).selections[0].version,'1.8.3');
 recordTaskUsage({taskId:task.taskId,requirementId:beast.requirementId,note:'User reported running BEAST',reportedBy:'user_reported'},repository);
 assert.equal(getTaskSoftware(task.taskId,repository).requirements[0].actualUsageState,'explicitly_reported_used');
 assert.equal(jsonStore('tasks',root).get(task.taskId).requirements[0].usage.length,1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
