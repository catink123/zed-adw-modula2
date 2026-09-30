// Parses every .def/.mod under the given folders with the wasm grammar and reports files with syntax errors.
// usage: node test/corpus.mjs <folder>... [--show N]
import fs from 'fs';
import path from 'path';
import { Parser, Language } from 'web-tree-sitter';

const args = process.argv.slice(2);
const show = args.includes('--show') ? Number(args[args.indexOf('--show') + 1]) : 10;
const roots = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--show');
await Parser.init();
const lang = await Language.load(new URL('../tree-sitter-modula2.wasm', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const parser = new Parser();
parser.setLanguage(lang);

const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === '.svn' || e.name === 'node_modules') continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(def|mod)$/i.test(e.name)) files.push(p); } };
roots.forEach(walk);
let bad = 0, errNodes = 0, bytes = 0;
const samples = [];
const t0 = Date.now();
for (const f of files) {
  let text = fs.readFileSync(f, 'latin1');
  if (text.startsWith('ï»¿')) text = text.slice(3);
  bytes += text.length;
  const tree = parser.parse(text);
  if (!tree.rootNode.hasError) { tree.delete(); continue; }
  bad++;
  const errs = [];
  const visit = n => {
    if (n.isError || n.isMissing) { errs.push(n); return; }
    if (!n.hasError) return;
    for (const c of n.children) visit(c);
  };
  visit(tree.rootNode);
  errNodes += errs.length;
  if (samples.length < show && errs.length) {
    const e = errs[0];
    const line = text.split('\n')[e.startPosition.row] ?? '';
    samples.push(`${f}:${e.startPosition.row + 1}: ${e.isMissing ? 'MISSING ' + e.type : 'ERROR'} (${errs.length} in file)\n    ${line.trim().slice(0, 150)}`);
  }
  tree.delete();
}
console.log(`files ${files.length}, ${(bytes / 1e6).toFixed(1)} MB, ${Date.now() - t0} ms; files with errors ${bad} (${(100 * bad / files.length).toFixed(1)}%), error nodes ${errNodes}`);
samples.forEach(s => console.log(s));
