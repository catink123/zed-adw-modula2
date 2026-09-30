// Parses Modula-2 text (argument, a file, or a file:line-range) and prints the tree, marking errors.
// usage: node test/snippet.mjs "<source>" | node test/snippet.mjs --file <path> [from to]
import fs from 'fs';
import { Parser, Language } from 'web-tree-sitter';
await Parser.init();
const lang = await Language.load(new URL('../tree-sitter-modula2.wasm', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const p = new Parser(); p.setLanguage(lang);
const a = process.argv.slice(2);
let text = a[0] === '--file' ? fs.readFileSync(a[1], 'latin1') : a[0];
if (a[0] === '--file' && a[2] && !a[2].startsWith('--')) text = text.split('\n').slice(Number(a[2]) - 1, Number(a[3])).join('\n');
const t = p.parse(text);
const show = (n, d) => {
  if (d > 40) return;
  const mark = n.isError ? 'ERROR ' : n.isMissing ? 'MISSING ' : '';
  if (n.isNamed || mark) console.log(`${'  '.repeat(d)}${mark}${n.type} [${n.startPosition.row + 1}:${n.startPosition.column}] ${n.childCount ? '' : JSON.stringify(n.text.slice(0, 40))}${mark && n.childCount ? ' ' + JSON.stringify(n.text.slice(0, 60)) : ''}`);
  for (const c of n.children) show(c, d + 1);
};
if (a.includes('--errors')) {
  const v = n => { if (n.isError || n.isMissing) console.log(`${n.isMissing ? 'MISSING ' + n.type : 'ERROR'} ${n.startPosition.row + 1}:${n.startPosition.column} parent=${n.parent?.type} ${JSON.stringify(n.text.slice(0, 80))}`); else if (n.hasError) n.children.forEach(v); };
  v(t.rootNode);
} else show(t.rootNode, 0);
