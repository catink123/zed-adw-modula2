(procedure_declaration) @function.around
(macro_procedure) @function.around
(procedure_declaration (statement_sequence) @function.inside)

(class_definition) @class.around
(class_declaration) @class.around
(type_declaration (record_type)) @class.around

(comment)+ @comment.around
