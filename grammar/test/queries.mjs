// Compiles every Zed query file against the grammar and runs highlights/outline on a sample file.
// usage: node test/queries.mjs [file.mod]
import fs from 'fs';
import path from 'path';
import { Parser, Language, Query } from 'web-tree-sitter';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
await Parser.init();
const lang = await Language.load(path.join(here, '..', 'tree-sitter-modula2.wasm'));
const qdir = path.join(here, '..', '..', 'languages', 'modula2');
const queries = {};
let failed = false;
for (const f of fs.readdirSync(qdir).filter(f => f.endsWith('.scm'))) {
  try {
    queries[f] = new Query(lang, fs.readFileSync(path.join(qdir, f), 'utf8'));
    console.log(`ok   ${f} (${queries[f].patternCount()} patterns)`);
  } catch (e) {
    failed = true;
    console.log(`FAIL ${f}: ${e.message}`);
  }
}
const sample = process.argv[2];
if (sample && !failed) {
  const parser = new Parser();
  parser.setLanguage(lang);
  const text = fs.readFileSync(sample, 'latin1');
  const tree = parser.parse(text);
  const caps = queries['highlights.scm'].captures(tree.rootNode);
  const counts = {};
  for (const c of caps) counts[c.name] = (counts[c.name] ?? 0) + 1;
  console.log('highlight captures:', JSON.stringify(counts));
  // final highlight of a few interesting identifiers (last capture wins, as in Zed)
  const last = new Map();
  for (const c of caps) last.set(`${c.node.startIndex}`, { name: c.name, text: c.node.text });
  const want = process.argv.slice(3);
  for (const w of want) {
    const hits = [...last.values()].filter(v => v.text === w).map(v => v.name);
    console.log(`  ${w}: ${[...new Set(hits)].join(', ')}`);
  }
  const items = queries['outline.scm'].matches(tree.rootNode).map(m => {
    const name = m.captures.find(c => c.name === 'name')?.node.text;
    const ctx = m.captures.filter(c => c.name === 'context').map(c => c.node.text).join(' ');
    const item = m.captures.find(c => c.name === 'item').node;
    return `${item.startPosition.row + 1}: ${ctx ? ctx + ' ' : ''}${name}`;
  });
  console.log(`outline items: ${items.length}`);
  console.log(items.slice(0, 12).map(s => '  ' + s).join('\n'));
}
process.exit(failed ? 1 : 0);
