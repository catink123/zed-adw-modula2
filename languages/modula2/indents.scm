[
  (record_type)
  (bitfields)
  (variant_part)
  (if_statement)
  (case_statement)
  (while_statement)
  (for_statement)
  (loop_statement)
  (with_statement)
  (guard_statement)
  (repeat_statement)
  (asm_statement)
  (procedure_declaration)
  (macro_procedure)
  (class_definition)
  (class_declaration)
  (local_module)
  (const_section)
  (type_section)
  (var_section)
] @indent

(_ "END" @end)
(repeat_statement "UNTIL" @end)
(_ "(" ")" @end) @indent
(_ "[" "]" @end) @indent
(_ "{" "}" @end) @indent
