import path from 'node:path';
import {unlink,rmdir} from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolvePaths } from './core.mjs';
import { normalizeLocation } from './locations.mjs';

export function createPathPicker({launch=execFile,platform=process.platform}={}) {
 const requests=new Map();
 return {
  begin({mode='file',purpose='software',initialDirectory}={}){
   if(platform!=='win32')throw Error('系统路径选择窗口仅支持 Windows');
   if(!['file','folder'].includes(mode)||!['software','output'].includes(purpose))throw Error('选择模式无效');
   for(const old of requests.values())if(old.status==='pending')throw Error('已有选择窗口打开，请先选择或取消');
   if(initialDirectory)initialDirectory=normalizeLocation(initialDirectory);
   if(requests.size>=30){for(const [key,value] of requests)if(value.status!=='pending')requests.delete(key);}
   const requestId=randomUUID();requests.set(requestId,{requestId,status:'pending',createdAt:new Date().toISOString()});
   const source = `using System;using System.IO;using System.Text;using System.Windows.Forms;using System.Web.Script.Serialization;
class BioinfoPathPicker { [STAThread] static void Main(){
 Application.EnableVisualStyles(); object result;
 using(var owner=new Form()){owner.TopMost=true;owner.Text="生信小助手 · 选择路径";owner.ShowInTaskbar=true;owner.Width=320;owner.Height=80;owner.StartPosition=FormStartPosition.CenterScreen;owner.Show();
 string initial=Environment.GetEnvironmentVariable("BIOINFO_PICK_INITIAL");
 if(Environment.GetEnvironmentVariable("BIOINFO_PICK_MODE")=="folder"){
 using(var d=new FolderBrowserDialog()){d.Description="选择软件或产出文件夹";d.ShowNewFolderButton=false;if(!String.IsNullOrEmpty(initial))d.SelectedPath=initial;
 result=d.ShowDialog(owner)==DialogResult.OK?(object)new {status="selected",path=d.SelectedPath}:new {status="cancelled"};}}
 else{using(var d=new OpenFileDialog()){d.Title="选择软件或产出文件";d.CheckFileExists=true;d.Multiselect=false;d.Filter=Environment.GetEnvironmentVariable("BIOINFO_PICK_PURPOSE")=="software"?"软件文件|*.exe;*.bat;*.cmd;*.jar|所有文件|*.*":"所有文件|*.*";if(!String.IsNullOrEmpty(initial))d.InitialDirectory=initial;
 result=d.ShowDialog(owner)==DialogResult.OK?(object)new {status="selected",path=d.FileName}:new {status="cancelled"};}}}
 using(var output=new StreamWriter(Console.OpenStandardOutput(),new UTF8Encoding(false))){output.Write(new JavaScriptSerializer().Serialize(result));}
 }} `;
   const script=`$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new();
   $folder=$env:BIOINFO_PICK_HELPER_DIR;[IO.Directory]::CreateDirectory($folder)|Out-Null;
   $exe=Join-Path $folder 'BioinfoPathPicker.exe';
   Add-Type -TypeDefinition $env:BIOINFO_PICK_SOURCE -OutputAssembly $exe -OutputType WindowsApplication -ReferencedAssemblies System.Windows.Forms,System.Drawing,System.Web.Extensions;
   `;
   const ps=path.win32.join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
   const pickerEnv={...process.env,BIOINFO_PICK_SOURCE:source,BIOINFO_PICK_HELPER_DIR:path.join(resolvePaths().dataRoot,'native-picker',requestId),BIOINFO_PICK_MODE:mode,BIOINFO_PICK_PURPOSE:purpose,BIOINFO_PICK_INITIAL:initialDirectory || ''};
   const receive=async(error,stdout)=>{
    await unlink(path.join(pickerEnv.BIOINFO_PICK_HELPER_DIR,'BioinfoPathPicker.exe')).catch(()=>{});await rmdir(pickerEnv.BIOINFO_PICK_HELPER_DIR).catch(()=>{});
    if(error){requests.set(requestId,{requestId,status:'failed',reason:'路径选择未完成、超时或系统对话框不可用'});return;}
    try{const result=JSON.parse(stdout.replace(/^\uFEFF/,'').trim());if(result.status==='selected')result.path=normalizeLocation(result.path);if(!['selected','cancelled'].includes(result.status))throw Error();requests.set(requestId,{requestId,...result});}
    catch{requests.set(requestId,{requestId,status:'failed',reason:'无法读取选择结果'});}
   };
   launch(ps,['-NoLogo','-NoProfile','-NonInteractive','-STA','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{
    env:{...process.env,BIOINFO_PICK_SOURCE:source,BIOINFO_PICK_HELPER_DIR:path.join(resolvePaths().dataRoot,'native-picker',requestId),BIOINFO_PICK_MODE:mode,BIOINFO_PICK_PURPOSE:purpose,BIOINFO_PICK_INITIAL:initialDirectory || ''},windowsHide:true,timeout:180000,maxBuffer:65536,encoding:'utf8',
   },(error)=>{if(error){receive(error);return;}launch(path.join(pickerEnv.BIOINFO_PICK_HELPER_DIR,'BioinfoPathPicker.exe'),[],{env:pickerEnv,windowsHide:false,timeout:180000,maxBuffer:65536,encoding:'utf8'},receive);});
   // Native dialog stays open while MCP returns immediately. Poll without blocking the chat.
   return {requestId,status:'pending'};
  },
  get(requestId){const result=requests.get(requestId);if(!result)throw Error('选择请求不存在或插件服务已重启');return structuredClone(result);},
 };
}
export const pathPicker=createPathPicker();
