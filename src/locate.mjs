import path from 'node:path';
import { lstat } from 'node:fs/promises';
import { getSoftware } from './catalog.mjs';
import { discoverSoftware } from './discover.mjs';
import { inspectSoftware } from './inspect.mjs';

// Manual fallback accepts a directory or exact file, including renamed files.
export async function locateSoftware(inputPath, id, options = {}) {
  const target = inputPath.trim().replace(/^"(.*)"$/, '$1');
  if (!path.isAbsolute(target)) throw Error('请输入软件文件或文件夹的绝对路径');
  if (id) getSoftware(id);
  let info;
  try { info = await (options.lstat || lstat)(target); }
  catch (e) {
    if (['ENOENT', 'ENOTDIR'].includes(e.code)) return { status: 'not_found', path: target, candidates: [], reason: '路径不存在，请检查后重新补充路径', nextAction: 'provide_file_or_directory' };
    return { status: 'unreadable', path: target, candidates: [], reason: `无法读取路径：${e.code || e.message}`, nextAction: 'provide_accessible_path' };
  }
  if (info.isSymbolicLink()) return { status: 'link_not_followed', path: target, candidates: [], reason: '请提供链接或目录联接实际指向的软件路径' };
  if (info.isDirectory()) {
    const discovery = await (options.discover || discoverSoftware)([target]);
    const candidates = id ? discovery.candidates.filter(c => c.id === id) : discovery.candidates;
    return { ...discovery, status: candidates.length ? 'candidates_found' : 'not_found', path: target, candidates,
      reason: candidates.length ? '发现软件候选，请核对具体文件和身份信息' : '限定目录未找到匹配文件；可直接补充软件文件完整路径（支持重命名文件）',
      nextAction: candidates.length ? 'review_candidates' : 'provide_exact_file' };
  }
  if (!info.isFile()) return { status: 'unsupported_file', path: target, candidates: [], reason: '路径不是普通软件文件或文件夹' };
  const extension = path.extname(target).toLowerCase();
  if (!['.exe', '.bat', '.cmd', '.jar'].includes(extension)) return { status: 'unsupported_file', path: target, candidates: [], reason: '请指定 EXE、BAT、CMD 或 JAR 软件文件；快捷方式请改填目标路径' };
  const inspection = id && extension === '.exe' ? await (options.inspect || inspectSoftware)(id, target) : {
    ...(id ? { id } : {}), status: 'found', executablePath: target, identity: 'unverified', version: null, runnable: 'not_tested',
    reason: id ? '文件存在；脚本/JAR 未执行，身份与版本待核验' : '文件存在；未指定目录软件 id，身份、版本与引用待确认',
  };
  return { status: 'file_found', path: target, candidates: [{ ...inspection, discoverySource: 'manual_file' }], reason: inspection.reason, nextAction: 'review_candidates' };
}
