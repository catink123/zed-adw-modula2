# ADW Modula-2 for Zed

Support for **ADW / Stony Brook Modula-2** in [Zed](https://zed.dev): ISO Modula-2 plus the ADW extensions
(ISO OO classes, generic modules, `UNSAFEGUARDED`, `MACRO`/`PUREASM` procedures, `BAND`/`BOR`/`SHL`, `x:T`
type transfers, `"text"A` strings, `<* pragmas *>`, `%IF` / `<*IF*>` conditional compilation, ...).

Two parts:

- **Tree-sitter grammar** (`grammar/`) for syntax highlighting, the outline panel, bracket matching,
  indentation, text objects and `(* *)` toggling. It parses every one of the 1,683 files of a large production
  ADW code base (56 MB) without a single syntax error, as well as the ADW library sources.
- **Language server** [adw-modula2-lsp](https://github.com/catink123/adw-modula2-lsp) (the same one the VS Code
  extension uses) for go to definition / declaration / implementation / type definition, find references,
  rename, hover documentation, completion, signature help, document highlights, call hierarchy, workspace
  symbols, diagnostics and ADW compiler `*.err` messages.

## Language server

The extension finds the server in this order:

1. `lsp.adw-modula2-lsp.binary` in your Zed settings. Zed runs `path` directly, so for the Node script set
   `path` to `node.exe` and pass the script in `arguments` (see below);
2. an `adw-modula2-lsp` executable on the `PATH`;
3. the `adw-modula2-lsp-server.js` asset of the latest [release](https://github.com/catink123/adw-modula2-lsp/releases),
   downloaded automatically and run with Zed's Node.js.

## Settings

Server settings are the same as the VS Code extension's `modula2.*` settings, placed under
`lsp.adw-modula2-lsp.settings` in Zed's `settings.json`:

```jsonc
{
  "lsp": {
    "adw-modula2-lsp": {
      "settings": {
        "adwPath": "C:\\Program Files (x86)\\ADW Software Modula-2", // its *def folders are indexed
        "searchPaths": [],                                           // extra folders with .def/.mod files
        "defines": { "VIEWER": false, "DEBUG": false },              // conditional compilation symbols
        "exclude": ["**/.svn/**", "**/.git/**", "**/node_modules/**"],
        "diagnostics": {
          "unresolvedIdentifiers": "information",                  // off | hint | information | warning | error
          "compilerErrors": true                                   // show ADW *.err messages
        }
      }
      // "binary": {
      //   "path": "C:\\Program Files\\nodejs\\node.exe",
      //   "arguments": ["C:\\path\\to\\adw-modula2-lsp-server.js", "--stdio"]
      // }
    }
  }
}
```

ADW sources are usually Windows-1252 encoded. Zed opens files as UTF-8, so accented characters in comments or
strings may show as replacement characters; positions and navigation are unaffected.

Tip: *go to implementation* on a DEF module name opens the MOD, *go to declaration* on a MOD module name opens the DEF.

## Conditional compilation

The grammar always parses the first branch of `<*IF*>` / `%IF` and shows later `ELSIF`/`ELSE` branches as
inactive (comment-coloured), so alternative declarations never collide. The language server evaluates the
conditions properly using `defines`.

## Development

```
cargo build --release --target wasm32-wasip2   # the extension (Zed builds it itself on install)
cd grammar
npm install                                    # web-tree-sitter for the tests
tree-sitter generate                           # after editing grammar.js
tree-sitter build --wasm -o tree-sitter-modula2.wasm
node test/corpus.mjs <folder>...               # parse every .def/.mod, report files with syntax errors
node test/queries.mjs <file.mod> [identifiers] # compile all Zed queries, show captures and outline
node test/snippet.mjs "<source>"               # print the tree for a snippet (--file <path> [from to] [--errors])
```

To try it locally: *zed: install dev extension* and pick this folder. For a dev install before the grammar is
pushed, point `[grammars.modula2] repository` at `file:///C:/path/to/zed-adw-modula2` (keeping `rev` a commit of
this repository).

`extension.toml` pins the grammar to a commit (`rev`); after changing `grammar/`, commit, then update `rev`.

## License

MIT
