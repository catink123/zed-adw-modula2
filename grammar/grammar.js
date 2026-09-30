/**
 * @file Tree-sitter grammar for ADW (Stony Brook) Modula-2
 * @license MIT
 *
 * ISO Modula-2 plus the ADW extensions: ISO OO classes (CLASS / INHERIT / REVEAL / OVERRIDE / GUARD),
 * generic modules and instances, UNSAFEGUARDED, MACRO / PUREASM / ASSEMBLER procedures, ASM blocks,
 * BITFIELDS, typed constants, initialized variables, BAND/BOR/SHL... operators, "text"A strings,
 * <* pragmas *> and %IF conditional compilation (kept as extras: both branches are parsed).
 *
 * Definition modules and implementation/program modules use separate declaration rules because a
 * procedure heading in a DEF has no body while one in a MOD has.
 */

/* eslint-disable arrow-parens, camelcase */

const PREC = {
  relation: 1,
  add: 2,
  mul: 3,
  unary: 4,
  selector: 5,
};

const commaSep1 = (r) => seq(r, repeat(seq(',', r)));
const commaSep = (r) => optional(commaSep1(r));

module.exports = grammar({
  name: 'modula2',

  word: $ => $.identifier,

  externals: $ => [$.comment, $.pragma, $.inactive_code, $.number],

  extras: $ => [/\s/, $.comment, $.pragma, $.inactive_code],

  conflicts: $ => [[$.label, $._designator_head]],

  supertypes: $ => [$._statement, $._type],

  rules: {
    source_file: $ => choice(
      $.definition_module,
      $.implementation_module,
      $.program_module,
      $.module_instance,
    ),

    // ------------------------------------------------------------------ modules
    _module_prefix: _ => repeat1(choice('UNSAFEGUARDED', 'GENERIC')),

    definition_module: $ => seq(
      optional($._module_prefix),
      'DEFINITION', 'MODULE', field('name', $.identifier),
      optional($.generic_parameters),
      ';',
      repeat($._import),
      repeat($._def_declaration),
      'END', field('end_name', $.identifier), '.',
    ),

    implementation_module: $ => seq(
      optional($._module_prefix),
      'IMPLEMENTATION', 'MODULE', field('name', $.identifier),
      optional($.generic_parameters),
      optional($.priority),
      ';',
      $._impl_block,
      field('end_name', $.identifier), '.',
    ),

    program_module: $ => seq(
      optional($._module_prefix),
      'MODULE', field('name', $.identifier),
      optional($.priority),
      ';',
      $._impl_block,
      field('end_name', $.identifier), '.',
    ),

    // DEFINITION MODULE Unicode = GenString(...); END Unicode.
    module_instance: $ => seq(
      optional($._module_prefix),
      optional(choice('DEFINITION', 'IMPLEMENTATION')),
      'MODULE', field('name', $.identifier), '=',
      field('generic', $.qualident), optional($.actual_parameters), optional(';'),
      repeat($._import),
      'END', field('end_name', $.identifier), '.',
    ),

    generic_parameters: $ => seq('(', optional(seq($.generic_parameter, repeat(seq(';', $.generic_parameter)))), optional(';'), ')'),
    generic_parameter: $ => seq(commaSep1(field('name', $.identifier)), ':', choice('TYPE', $._type)),

    priority: $ => seq('[', $._expression, ']'),

    // ------------------------------------------------------------------ imports / exports
    _import: $ => choice($.import_list, $.from_import),

    import_list: $ => seq('IMPORT', commaSep1(field('module', $.identifier)), ';'),

    from_import: $ => seq(
      'FROM', field('module', $.identifier), 'IMPORT',
      choice(alias('*', $.wildcard), commaSep1(field('name', $.identifier))),
      ';',
    ),

    export_list: $ => seq('EXPORT', optional('QUALIFIED'), commaSep1($.identifier), ';'),

    // ------------------------------------------------------------------ declarations
    _def_declaration: $ => choice(
      $.const_section,
      $.type_section,
      $.var_section,
      $.procedure_heading_declaration,
      $.macro_procedure,
      $.procedure_alias,
      $.class_definition,
      $.forward_class,
      $.assert_declaration,
      ';',
    ),

    _impl_declaration: $ => choice(
      $._import,
      $.const_section,
      $.type_section,
      $.var_section,
      $.procedure_declaration,
      $.forward_procedure,
      $.abstract_procedure,
      $.procedure_alias,
      $.class_declaration,
      $.forward_class,
      $.local_module,
      $.module_instance_declaration,
      $.export_list,
      $.assert_declaration,
      ';',
    ),

    // declarations [BEGIN stmts] [EXCEPT stmts] [FINALLY stmts] END
    _impl_block: $ => seq(
      repeat($._impl_declaration),
      optional($._body),
      'END',
    ),

    _body: $ => choice(
      seq(
        choice(
          seq('BEGIN', optional($.statement_sequence)),
          seq('EXCEPT', optional($.statement_sequence)),
          seq('FINALLY', optional($.statement_sequence)),
        ),
        optional(seq('EXCEPT', optional($.statement_sequence))),
        optional(seq('FINALLY', optional($.statement_sequence))),
      ),
      $.asm_body,
    ),

    asm_body: $ => seq('ASM', repeat($._asm_token)),

    const_section: $ => prec.right(seq('CONST', repeat($.const_declaration))),
    const_declaration: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=', field('value', $._expression), ';',
    ),

    type_section: $ => prec.right(seq('TYPE', repeat($.type_declaration))),
    type_declaration: $ => seq(
      field('name', $.identifier),
      optional(seq('=', field('type', $._type))),
      ';',
    ),

    var_section: $ => prec.right(seq('VAR', repeat($.variable_declaration))),
    variable_declaration: $ => seq(
      $._variable_names, ':', field('type', $._type),
      optional(seq('=', field('value', $._expression))),
      ';',
    ),
    _variable_names: $ => commaSep1(seq(field('name', $.identifier), optional($.attribute_list))),

    assert_declaration: $ => seq('ASSERT', '(', $._expression, ')', ';'),

    // ------------------------------------------------------------------ procedures
    procedure_heading: $ => seq(
      optional(field('modifier', choice('OVERRIDE', 'ABSTRACT'))),
      'PROCEDURE',
      field('name', $.identifier),
      optional($.attribute_list),
      optional(seq(
        field('parameters', $.formal_parameters),
        optional(seq(':', field('result', $.qualident))),
      )),
      optional($.attribute_list),
      ';',
      repeat($.procedure_directive),
    ),

    procedure_directive: _ => seq(choice('PUREASM', 'ASSEMBLER'), ';'),

    formal_parameters: $ => seq('(', optional(seq($.parameter, repeat(seq(';', $.parameter)))), optional(';'), ')'),
    parameter: $ => seq(
      optional(field('mode', choice('VAR', 'CONST'))),
      optional(choice('INOUT', 'OUT', 'IN')),
      commaSep1(field('name', $.identifier)),
      ':',
      optional(choice('VALUE', 'NOHIGH')),
      field('type', $._type),
    ),

    // DEF: heading only
    procedure_heading_declaration: $ => $.procedure_heading,

    // DEF: PROCEDURE x(...); MACRO; <body> END x;
    macro_procedure: $ => seq(
      $.procedure_heading, 'MACRO', ';',
      $._impl_block, field('end_name', $.identifier), ';',
    ),

    // MOD: full procedure
    procedure_declaration: $ => seq(
      $.procedure_heading,
      optional(seq('MACRO', ';')),
      $._impl_block,
      field('end_name', $.identifier), ';',
    ),

    forward_procedure: $ => seq($.procedure_heading, 'FORWARD', ';'),

    abstract_procedure: $ => prec(1, seq(
      'ABSTRACT', 'PROCEDURE', field('name', $.identifier),
      optional(seq($.formal_parameters, optional(seq(':', field('result', $.qualident))))),
      optional($.attribute_list),
      ';',
    )),

    procedure_alias: $ => seq('PROCEDURE', field('name', $.identifier), '=', field('target', $.qualident), ';'),

    attribute_list: $ => seq('[', repeat($._attribute_token), ']'),
    _attribute_token: $ => choice($.identifier, $.number, $.string, ',', ':', '=', '.', '-', '+', '*', seq('(', repeat($._attribute_token), ')')),

    // ------------------------------------------------------------------ classes
    _class_prefix: _ => repeat1(choice('ABSTRACT', 'TRACED', 'UNTRACED')),

    forward_class: $ => prec(1, seq(optional($._class_prefix), 'CLASS', field('name', $.identifier), optional(';'), 'FORWARD', ';')),

    class_definition: $ => seq(
      optional($._class_prefix), 'CLASS', field('name', $.identifier), ';',
      repeat(choice($.inherit_clause, $.reveal_list, $._def_declaration)),
      'END', field('end_name', $.identifier), ';',
    ),

    class_declaration: $ => seq(
      optional($._class_prefix), 'CLASS', field('name', $.identifier), ';',
      repeat(choice($.inherit_clause, $.reveal_list, $._impl_declaration)),
      optional($._body),
      'END', field('end_name', $.identifier), ';',
    ),

    inherit_clause: $ => seq('INHERIT', field('base', $.qualident), ';'),
    reveal_list: $ => seq('REVEAL', commaSep1(seq(optional('READONLY'), $.identifier)), ';'),

    // ------------------------------------------------------------------ local modules
    local_module: $ => seq(
      'MODULE', field('name', $.identifier), optional($.priority), ';',
      $._impl_block,
      field('end_name', $.identifier), ';',
    ),

    module_instance_declaration: $ => prec.right(seq(
      'MODULE', field('name', $.identifier), '=',
      field('generic', $.qualident), optional($.actual_parameters), ';',
      optional(seq(repeat1($.export_list), 'END', field('end_name', $.identifier), ';')),
    )),

    actual_parameters: $ => seq('(', commaSep($._expression), ')'),

    // ------------------------------------------------------------------ types
    _type: $ => choice(
      $.qualident,
      $.subrange_type,
      $.enumeration_type,
      $.array_type,
      $.record_type,
      $.set_type,
      $.pointer_type,
      $.procedure_type,
    ),

    qualident: $ => prec.left(seq($.identifier, repeat(seq('.', $.identifier)))),

    subrange_type: $ => seq(optional(field('base', $.qualident)), '[', $._expression, '..', $._expression, ']'),

    enumeration_type: $ => prec.right(seq(
      '(', commaSep($.enumerator), optional(','), ')',
      optional('BIG'),
    )),
    enumerator: $ => seq(field('name', $.identifier), optional(seq('=', $._expression))),

    array_type: $ => seq('ARRAY', optional(commaSep1(field('index', $._type))), 'OF', field('element', $._type)),

    record_type: $ => seq('RECORD', optional($._field_list_sequence), 'END'),
    _field_list_sequence: $ => prec.right(repeat1(choice($.field_declaration, $.variant_part, $.bitfields, ';'))),
    field_declaration: $ => seq(
      commaSep1(field('name', $.identifier)), ':', field('type', $._type),
      optional(seq('BY', $._expression)),
    ),
    bitfields: $ => seq('BITFIELDS', optional($._field_list_sequence), 'END'),
    variant_part: $ => seq(
      'CASE', optional(field('tag', $.identifier)), optional(':'), field('tag_type', $.qualident), 'OF',
      optional($.variant),
      repeat(seq(choice('|', '!'), optional($.variant))),
      optional(seq('ELSE', optional($._field_list_sequence))),
      'END',
    ),
    variant: $ => prec.right(seq($.case_labels, ':', optional($._field_list_sequence))),

    set_type: $ => prec.right(seq(choice('SET', 'PACKEDSET'), 'OF', $._type, optional('BIG'))),
    pointer_type: $ => seq('POINTER', 'TO', $._type),
    procedure_type: $ => prec.right(seq(
      'PROCEDURE',
      optional(seq(
        '(', optional(seq($.formal_type, repeat(seq(choice(',', ';'), $.formal_type)))), ')',
        optional(seq(':', field('result', $.qualident))),
      )),
      optional($.attribute_list),
    )),
    formal_type: $ => seq(
      optional(choice('VAR', 'CONST')),
      optional(choice('INOUT', 'OUT', 'IN')),
      optional(seq(commaSep1($.identifier), ':')),
      optional(choice('VALUE', 'NOHIGH')),
      $._type,
    ),

    // ------------------------------------------------------------------ statements
    statement_sequence: $ => prec.right(repeat1(choice($._statement, ';'))),

    _statement: $ => choice(
      $.assignment,
      $.call_statement,
      $.if_statement,
      $.case_statement,
      $.while_statement,
      $.repeat_statement,
      $.for_statement,
      $.loop_statement,
      $.with_statement,
      $.guard_statement,
      $.return_statement,
      $.exit_statement,
      $.retry_statement,
      $.asm_statement,
      $.label,
    ),

    // ADW statement label (loop name)
    label: $ => prec.dynamic(-2, seq(field('name', $.identifier), ':')),

    assignment: $ => seq(field('left', $.designator), ':=', field('right', $._expression)),
    call_statement: $ => prec(-1, seq(optional('FUNC'), $.designator)),

    if_statement: $ => seq(
      'IF', field('condition', $._expression), 'THEN', optional($.statement_sequence),
      repeat($.elsif_clause),
      optional($.else_clause),
      'END',
    ),
    elsif_clause: $ => seq('ELSIF', field('condition', $._expression), 'THEN', optional($.statement_sequence)),
    else_clause: $ => seq('ELSE', optional($.statement_sequence)),

    case_statement: $ => seq(
      'CASE', field('value', $._expression), 'OF',
      optional($.case_arm),
      repeat(seq(choice('|', '!'), optional($.case_arm))),
      optional($.else_clause),
      'END',
    ),
    case_arm: $ => prec.right(seq($.case_labels, ':', optional($.statement_sequence))),
    case_labels: $ => commaSep1(seq($._expression, optional(seq('..', $._expression)))),

    while_statement: $ => seq('WHILE', field('condition', $._expression), 'DO', optional($.statement_sequence), 'END'),
    repeat_statement: $ => seq('REPEAT', optional($.statement_sequence), 'UNTIL', field('condition', $._expression)),
    for_statement: $ => seq(
      'FOR', field('variable', $.identifier), ':=', field('from', $._expression),
      'TO', field('to', $._expression), optional(seq('BY', field('step', $._expression))),
      'DO', optional($.statement_sequence), 'END',
    ),
    loop_statement: $ => seq('LOOP', optional($.statement_sequence), 'END'),
    with_statement: $ => seq('WITH', field('record', $.designator), 'DO', optional($.statement_sequence), 'END'),

    guard_statement: $ => seq(
      'GUARD', field('value', $._expression), 'AS',
      optional($.guard_arm),
      repeat(seq('|', optional($.guard_arm))),
      optional($.else_clause),
      'END',
    ),
    guard_arm: $ => prec.right(seq(
      optional(seq(optional(field('variable', $.identifier)), ':')),
      field('class', $.qualident), 'DO', optional($.statement_sequence),
    )),

    return_statement: $ => prec.right(seq('RETURN', optional($._expression))),
    exit_statement: _ => 'EXIT',
    retry_statement: _ => 'RETRY',
    asm_statement: $ => seq('ASM', repeat($._asm_token), 'END'),
    _asm_token: $ => choice($.identifier, $.number, $.string, /[^\sA-Za-z0-9_'"(]/, '('),

    // ------------------------------------------------------------------ expressions
    _expression: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $.designator,
      $.number,
      $.string,
      $.set_constructor,
      $.parenthesized_expression,
    ),

    binary_expression: $ => {
      const table = [
        [PREC.relation, choice('=', '#', '<>', '<', '<=', '>', '>=', 'IN')],
        [PREC.add, choice('+', '-', 'OR', 'BOR', 'BXOR')],
        [PREC.mul, choice('*', '/', 'DIV', 'MOD', 'REM', 'AND', '&', 'BAND', 'SHL', 'SHR', 'SAR', 'ROL', 'ROR')],
      ];
      return choice(...table.map(([p, op]) => prec.left(p, seq(
        field('left', $._expression), field('operator', op), field('right', $._expression),
      ))));
    },

    unary_expression: $ => prec(PREC.unary, seq(field('operator', choice('NOT', '~', '-', '+', 'BNOT')), field('operand', $._expression))),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    set_constructor: $ => prec(PREC.selector, seq(
      optional(field('type', $.designator)),
      '{', commaSep(seq($._element, optional(seq('..', $._element)))), '}',
    )),
    _element: $ => choice($._expression, seq($._expression, 'BY', $._expression)),

    designator: $ => prec.left(PREC.selector, seq(
      $._designator_head,
      repeat(choice(
        $.field_access,
        $.index,
        $.dereference,
        $.arguments,
        $.type_transfer,
      )),
    )),
    // ADW type transfer: value:Type
    type_transfer: $ => prec.dynamic(-1, seq(':', field('type', $.qualident))),
    _designator_head: $ => $.identifier,
    field_access: $ => seq('.', field('field', $.identifier)),
    index: $ => seq('[', commaSep1(seq($._expression, optional(seq('..', $._expression)))), ']'),
    dereference: _ => '^',
    arguments: $ => seq('(', commaSep($._expression), ')'),

    // ------------------------------------------------------------------ lexical
    identifier: _ => /[A-Za-z_][A-Za-z0-9_]*/,

    string: _ => token(choice(
      seq('"', /[^"\n]*/, '"', optional(/[AU]/)),
      seq('\'', /[^'\n]*/, '\'', optional(/[AU]/)),
    )),

  },
});
