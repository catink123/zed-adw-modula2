; ADW Modula-2 highlights. Later patterns take precedence over earlier ones.

(identifier) @variable

; ---------------------------------------------------------------- literals
(number) @number
(string) @string
(comment) @comment
(pragma) @preproc
(inactive_code) @comment

; ---------------------------------------------------------------- keywords
[
  "MODULE" "DEFINITION" "IMPLEMENTATION" "UNSAFEGUARDED" "GENERIC"
  "IMPORT" "FROM" "EXPORT" "QUALIFIED"
  "CONST" "TYPE" "VAR" "PROCEDURE" "FORWARD"
  "CLASS" "INHERIT" "REVEAL" "OVERRIDE" "ABSTRACT" "READONLY" "TRACED" "UNTRACED"
  "BEGIN" "END" "EXCEPT" "FINALLY"
  "MACRO" "PUREASM" "ASSEMBLER" "ASM"
  "INOUT" "OUT" "VALUE" "NOHIGH" "BIG" "BITFIELDS" "ASSERT"
] @keyword

[
  "IF" "THEN" "ELSIF" "ELSE" "CASE" "OF" "WHILE" "DO" "REPEAT" "UNTIL"
  "FOR" "TO" "BY" "LOOP" "WITH" "GUARD" "AS" "RETURN" "FUNC"
] @keyword

(exit_statement) @keyword
(retry_statement) @keyword

[
  "ARRAY" "RECORD" "SET" "PACKEDSET" "POINTER"
] @keyword

[
  "AND" "OR" "NOT" "DIV" "MOD" "REM" "IN"
  "BAND" "BOR" "BXOR" "BNOT" "SHL" "SHR" "SAR" "ROL" "ROR"
] @keyword.operator

; ---------------------------------------------------------------- operators & punctuation
[
  ":=" "=" "#" "<>" "<" "<=" ">" ">=" "+" "-" "*" "/" "&" "~" ".."
] @operator

(dereference) @operator

[ "(" ")" "[" "]" "{" "}" ] @punctuation.bracket
[ ";" "," "." ":" "|" "!" ] @punctuation.delimiter

; ---------------------------------------------------------------- types
(qualident (identifier) @namespace . "." (identifier))
(qualident (identifier) @type .)

((identifier) @type.builtin
  (#match? @type.builtin "^(BOOLEAN|CHAR|ACHAR|UCHAR|INTEGER|CARDINAL|LONGINT|LONGCARD|SHORTINT|SHORTCARD|INTEGER8|INTEGER16|INTEGER32|INTEGER64|CARDINAL8|CARDINAL16|CARDINAL32|CARDINAL64|REAL|LONGREAL|SHORTREAL|COMPLEX|LONGCOMPLEX|BITSET|PROC|PROTECTION|ADDRESS|BYTE|WORD|DWORD|LOC|ADRCARD|ADRINT)$"))

((identifier) @constant.builtin
  (#match? @constant.builtin "^(TRUE|FALSE|NIL|EMPTY|NILPROC)$"))

((identifier) @variable.special
  (#eq? @variable.special "SELF"))

; ---------------------------------------------------------------- declarations
(definition_module name: (identifier) @namespace)
(definition_module end_name: (identifier) @namespace)
(implementation_module name: (identifier) @namespace)
(implementation_module end_name: (identifier) @namespace)
(program_module name: (identifier) @namespace)
(program_module end_name: (identifier) @namespace)
(module_instance name: (identifier) @namespace)
(module_instance end_name: (identifier) @namespace)
(local_module name: (identifier) @namespace)
(local_module end_name: (identifier) @namespace)
(module_instance_declaration name: (identifier) @namespace)
(import_list module: (identifier) @namespace)
(from_import module: (identifier) @namespace)
(generic_parameter name: (identifier) @type)

(type_declaration name: (identifier) @type)
(class_definition name: (identifier) @type)
(class_definition end_name: (identifier) @type)
(class_declaration name: (identifier) @type)
(class_declaration end_name: (identifier) @type)
(forward_class name: (identifier) @type)

(const_declaration name: (identifier) @constant)
(enumerator name: (identifier) @constant)

(field_declaration name: (identifier) @property)
(variant_part tag: (identifier) @property)
(field_access field: (identifier) @property)

(parameter name: (identifier) @variable.parameter)

(procedure_heading name: (identifier) @function)
(abstract_procedure name: (identifier) @function)
(procedure_alias name: (identifier) @function)
(procedure_declaration end_name: (identifier) @function)
(macro_procedure end_name: (identifier) @function)

(label name: (identifier) @label)

; ---------------------------------------------------------------- calls
(call_statement (designator . (identifier) @function .))
(call_statement (designator (field_access field: (identifier) @function) .))
(designator (identifier) @function . (arguments))
(designator (field_access field: (identifier) @function) . (arguments))

((designator . (identifier) @function.builtin . (arguments))
  (#match? @function.builtin "^(ABS|CAP|CHR|ACHR|UCHR|CMPLX|DEC|DISPOSE|EXCL|FLOAT|HALT|HIGH|IM|INC|INCL|INT|LENGTH|LFLOAT|MAX|MIN|NEW|ODD|ORD|ORD8|ORD16|ORD32|ORD64|INT8|INT16|INT32|INT64|RE|SIZE|TRUNC|VAL|CREATE|DESTROY|ISMEMBER|CLONE|ADR|CAST|TSIZE|UNREFERENCED_PARAMETER|FIXME|LONG|SHORT)$"))

(type_transfer type: (qualident (identifier) @type .))
