import citationRecords from './citations-data.json' with { type: 'json' };
// Curated records are version-specific. Never substitute a release for a local version.
const source = 'https://web.cbio.uct.ac.za/~darren/rdp.html';
const title = 'RDP4: Detection and analysis of recombination patterns in virus genomes';
const reference = `Martin DP, Murrell B, Golden M, Khoosal A, Muhire B. ${title}. Virus Evolution. 2015;1(1):vev003. doi:10.1093/ve/vev003.`;
export const catalog = [{
  id: 'rdp4', name: 'RDP4', aliases: ['Recombination Detection Program 4'],
  description: '病毒基因组序列比对的重组检测与分析',
  homepage: source, documentation: 'https://web.cbio.uct.ac.za/~darren/RDP4Manual.pdf',
  latestRelease: { version: '4.101', channel: '官网列出的 RDP4 较稳定版本', source, checkedAt: '2026-10-18' },
  citation: reference,
  citations: [{ title, reference, doi: '10.1093/ve/vev003',
    source: 'https://doi.org/10.1093/ve/vev003', checkedAt: '2026-10-18', verification: '既有论文记录；本轮 DOI 出版社跳转不可访问，官方推荐关系待重新核验',
    scope: 'RDP4 软件论文；使用具体检测方法时可能还需引用方法论文。官网当前主推荐为 RDP5，不能用于替代 RDP4 版本引用。',
    bibtex: '@article{Martin2015RDP4,\n  title = {RDP4: Detection and analysis of recombination patterns in virus genomes},\n  author = {Martin, Darren P. and Murrell, Ben and Golden, Michael and Khoosal, Arjun and Muhire, Brejnev},\n  journal = {Virus Evolution},\n  year = {2015},\n  volume = {1},\n  number = {1},\n  pages = {vev003},\n  doi = {10.1093/ve/vev003}\n}' }],
  checkedAt: '2026-10-18', operations: [], adaptation: '资料已登记，分析操作尚未适配',
  compatibility: 'Windows 软件；现代 Windows 上的运行兼容性尚待实测。',
  executableNames: ['RDP4.exe', 'RDP4Beta.exe', 'RDP4Beta101.exe'],
}];

// Detection coverage does not imply verified bibliography or analysis support.
const detectionRecords = [
 ['aliview','AliView',['AliView.exe'],'AliView'],
 ['beast','BEAST',['beast.exe'],'BEAST'],
 ['beauti','BEAUti',['beauti.exe'],'BEAUti'],
 ['tracer','Tracer',['tracer.exe'],'Tracer'],
 ['treeannotator','TreeAnnotator',['treeannotator.exe'],'TreeAnnotator'],
 ['logcombiner','LogCombiner',['logcombiner.exe'],'LogCombiner'],
 ['mafft','MAFFT',['mafft.bat','mafft.exe'],'MAFFT'],
 ['muscle','MUSCLE',['muscle.exe'],'MUSCLE'],
 ['fasttree','FastTree',['FastTree.exe'],'FastTree'],
 ['phyml','PhyML',['phyml.exe','phyml_win32.exe'],'PhyML'],
 ['mrbayes','MrBayes',['mrbayes.exe','mb.exe'],'MrBayes'],
 ['raxml','RAxML',['raxmlHPC.exe','raxmlHPC-PTHREADS.exe'],'RAxML'],
 ['clustalw','ClustalW',['clustalw.exe','clustalw2.exe'],'ClustalW'],
 ['simplot','SimPlot++',['SimPlot++.exe'],'SimPlot'],
 ['sdt','SDT',['SDTv1.exe'],'SDTv1'],
 ['blast','NCBI BLAST+',['blastn.exe','blastp.exe','blastx.exe','makeblastdb.exe'],'NCBI BLAST'],
 ['iqtree','IQ-TREE',['iqtree.exe','iqtree2.exe','iqtree3.exe'],'IQ-TREE'],
 ['samtools','SAMtools',['samtools.exe'],'samtools'],
 ['bcftools','BCFtools',['bcftools.exe'],'bcftools'],
 ['seqkit','SeqKit',['seqkit.exe'],'seqkit'],
 ['minimap2','minimap2',['minimap2.exe'],'minimap2'],
 ['bwa','BWA',['bwa.exe'],'bwa'],
 ['fastp','fastp',['fastp.exe'],'fastp'],
 ['fastqc','FastQC',['fastqc.exe','fastqc.bat'],'FastQC'],
 ['hisat2','HISAT2',['hisat2.exe','hisat2-align-s.exe','hisat2-align-l.exe'],'HISAT2'],
 ['megacc','MEGA command line',['megacc.exe'],'MEGA'],
];
for(const [id,name,executableNames,product] of detectionRecords) catalog.push({id,name,aliases:[],description:'软件文件发现与身份检测；资料与引用待核验',executableNames,product,operations:[],citations:[],adaptation:'仅支持文件检测，分析尚未适配'});

for (const software of catalog) {
 const citations = citationRecords.filter(c=>c.softwareIds.includes(software.id));
 if(citations.length) {
  software.citations = structuredClone(citations);
  software.citation = citations.map(c=>c.reference).join('\n\n');
  software.checkedAt = '2026-10-18';
  software.citationStatus = citations.every(c=>c.recommendationSource) ? 'official_recommendation_verified' : 'recommendation_pending';
  software.description = software.id === 'rdp4' ? software.description : software.name+' 软件检测与引用资料；请核对论文适用范围';
 }
}

export function matchesExecutable(software, name) {
 const lower=name.toLowerCase();
 if(software.executableNames.some(n=>n.toLowerCase()===lower)) return true;
 const prefixes={beast:'beast v',beauti:'beauti v',tracer:'tracer v',treeannotator:'treeannotator v',logcombiner:'logcombiner v',muscle:'muscle',phyml:'phyml_'};
 return !!prefixes[software.id] && lower.startsWith(prefixes[software.id]) && lower.endsWith('.exe');
}

export function listSoftware(query = '') {
  const q = query.trim().toLowerCase();
  return structuredClone(catalog.filter(s => [s.id, s.name, ...s.aliases, s.description].some(x => x.toLowerCase().includes(q))));
}
export function getSoftware(id) {
  const result = catalog.find(s => s.id === id);
  if (!result) throw new Error(`未登记的软件：${id}`);
  return structuredClone(result);
}
