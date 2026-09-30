; Module
(definition_module "MODULE" @context name: (identifier) @name) @item
(implementation_module "MODULE" @context name: (identifier) @name) @item
(program_module "MODULE" @context name: (identifier) @name) @item
(module_instance "MODULE" @context name: (identifier) @name) @item
(local_module "MODULE" @context name: (identifier) @name) @item
(module_instance_declaration "MODULE" @context name: (identifier) @name) @item

; Procedures (nested procedures nest automatically)
(procedure_heading_declaration
  (procedure_heading "PROCEDURE" @context name: (identifier) @name)) @item
(procedure_declaration
  (procedure_heading "PROCEDURE" @context name: (identifier) @name)) @item
(macro_procedure
  (procedure_heading "PROCEDURE" @context name: (identifier) @name)) @item
(forward_procedure
  (procedure_heading "PROCEDURE" @context name: (identifier) @name)) @item
(abstract_procedure "PROCEDURE" @context name: (identifier) @name) @item
(procedure_alias "PROCEDURE" @context name: (identifier) @name) @item

; Classes
(class_definition "CLASS" @context name: (identifier) @name) @item
(class_declaration "CLASS" @context name: (identifier) @name) @item

; Types, constants, record fields, enumeration constants
(type_declaration name: (identifier) @name) @item
(const_declaration name: (identifier) @name) @item
(field_declaration name: (identifier) @name) @item
(enumerator name: (identifier) @name) @item

; Variables at module / class level (not procedure locals)
(definition_module (var_section (variable_declaration name: (identifier) @name) @item))
(implementation_module (var_section (variable_declaration name: (identifier) @name) @item))
(program_module (var_section (variable_declaration name: (identifier) @name) @item))
(local_module (var_section (variable_declaration name: (identifier) @name) @item))
(class_definition (var_section (variable_declaration name: (identifier) @name) @item))
(class_declaration (var_section (variable_declaration name: (identifier) @name) @item))
