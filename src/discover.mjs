import path from 'node:path';
import { readdir, lstat } from 'node:fs/promises';
import { listSoftware, matchesExecutable } from './catalog.mjs';
import { inspectSoftware } from './inspect.mjs';

// Explicit, bounded roots only. Never follow junctions/symlinks or launch files.
export async function discoverSoftware(roots, { maxDepth = 3, maxEntries = 5000, inspect = inspectSoftware, softwareIds } = {}) {
  if (!Array.isArray(roots) || !roots.length || roots.length > 10) throw Error('请指定 1–10 个软件目录');
  for (const root of roots) if (!path.isAbsolute(root) || path.parse(root).root === path.resolve(root)) throw Error('请指定绝对软件目录，不能扫描整个盘符');
  const candidates = [], warnings = [], catalog = listSoftware().filter(s=>!softwareIds||softwareIds.includes(s.id));
  let visitedEntries = 0, truncated = false;
  const seen = new Set();
  async function walk(dir, depth) {
    if (visitedEntries >= maxEntries) { truncated = true; return; }
    try {
      const info = await lstat(dir);
      if (info.isSymbolicLink()) return;
      if (!info.isDirectory()) { warnings.push({ path: dir, reason: '不是目录' }); return; }
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (++visitedEntries > maxEntries) { truncated = true; return; }
        const file = path.join(dir, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory() && depth < maxDepth) await walk(file, depth + 1);
        if (!entry.isFile() || seen.has(file.toLowerCase())) continue;
        seen.add(file.toLowerCase());
        for (const software of catalog.filter(s => matchesExecutable(s, entry.name))) {
          const inspection = entry.name.toLowerCase().endsWith('.exe')
            ? await inspect(software.id, file)
            : { id: software.id, status: 'found', identity: 'unverified', version: null, reason: '发现脚本候选；未运行，身份和版本待核验', runnable: 'not_tested' };
          candidates.push({ id: software.id, name: software.name, executablePath: file, discoverySource: 'user_directory', ...inspection });
        }
      }
    } catch (e) { warnings.push({ path: dir, reason: e.code || e.message }); }
  }
  for (const root of roots) await walk(root, 0);
  return { roots, candidates, warnings, visitedEntries, truncated, maxDepth, maxEntries, checkedAt: new Date().toISOString(),
    nextAction: candidates.length ? 'review_candidates' : 'manual_locate',
    manualFallback: { tool: 'locate_software', accepts: ['absolute_directory', 'absolute_file'], reason: '未发现时补充文件夹或完整文件路径；未发现不代表未安装' },
    scope: '目录候选文件；不代表实际使用或可运行性，未启动任何软件' };
}
