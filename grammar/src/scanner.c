// External scanner for ADW Modula-2.
//
//  comment        (* ... *) with nesting
//  pragma         <* ... *>, and the directives %IF ... %THEN and %END
//  inactive_code  an <*ELSE*> / <*ELSIF ...*> / %ELSE / %ELSIF branch up to and including the matching END.
//                 The first branch of a conditional is always parsed and later branches are skipped, so
//                 alternative declarations (or alternative halves of an expression) never collide.
//  number         integers, 0FFH, 17B, 0C, and reals 1.5E-3 / 0. / 1.E-12 without swallowing the '..' of 0..3

#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <string.h>

enum TokenType { COMMENT, PRAGMA, INACTIVE_CODE, NUMBER };

void *tree_sitter_modula2_external_scanner_create(void) { return NULL; }
void tree_sitter_modula2_external_scanner_destroy(void *payload) { (void)payload; }
unsigned tree_sitter_modula2_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}
void tree_sitter_modula2_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

static inline void adv(TSLexer *l) { l->advance(l, false); }
static inline bool is_digit(int32_t c) { return c >= '0' && c <= '9'; }
static inline bool is_hex(int32_t c) { return is_digit(c) || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f'); }
static inline bool is_alpha(int32_t c) { return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '_'; }
static inline bool is_space(int32_t c) { return c == ' ' || c == '\t' || c == '\r' || c == '\n' || c == '\f' || c == '\v'; }

// reads an upper-case word into buf (truncated), returns its length
static unsigned read_word(TSLexer *l, char *buf, unsigned cap) {
  unsigned n = 0;
  while (is_alpha(l->lookahead) || is_digit(l->lookahead)) {
    if (n + 1 < cap) buf[n] = (char)l->lookahead;
    n++;
    adv(l);
  }
  buf[n < cap ? n : cap - 1] = 0;
  return n;
}

// after "(*" has been consumed
static void skip_comment_body(TSLexer *l) {
  unsigned depth = 1;
  while (depth > 0 && !l->eof(l)) {
    int32_t c = l->lookahead;
    adv(l);
    if (c == '(' && l->lookahead == '*') { adv(l); depth++; }
    else if (c == '*' && l->lookahead == ')') { adv(l); depth--; }
  }
}

// after "<*" has been consumed: consume to "*>"
static void skip_pragma_body(TSLexer *l) {
  while (!l->eof(l)) {
    int32_t c = l->lookahead;
    adv(l);
    if (c == '*' && l->lookahead == '>') { adv(l); return; }
  }
}

// skip a string literal (so quotes containing "%END" or "(*" do not confuse the skipper)
static void skip_string(TSLexer *l) {
  int32_t q = l->lookahead;
  adv(l);
  while (!l->eof(l) && l->lookahead != q && l->lookahead != '\n') adv(l);
  if (l->lookahead == q) adv(l);
}

// Skips an inactive branch. `percent` selects %IF-style or <*IF*>-style nesting.
// Stops after the END that closes the conditional the branch belongs to.
static void skip_inactive(TSLexer *l, bool percent) {
  unsigned depth = 1;
  char w[16];
  while (!l->eof(l)) {
    int32_t c = l->lookahead;
    if (c == '(') {
      adv(l);
      if (l->lookahead == '*') { adv(l); skip_comment_body(l); }
      continue;
    }
    if (c == '"' || c == '\'') { skip_string(l); continue; }
    if (!percent && c == '<') {
      adv(l);
      if (l->lookahead != '*') continue;
      adv(l);
      while (is_space(l->lookahead)) adv(l);
      read_word(l, w, sizeof w);
      if (strcmp(w, "IF") == 0) depth++;
      else if (strcmp(w, "END") == 0) depth--;
      skip_pragma_body(l);
      if (depth == 0) return;
      continue;
    }
    if (percent && c == '%') {
      adv(l);
      read_word(l, w, sizeof w);
      if (strcmp(w, "IF") == 0) depth++;
      else if (strcmp(w, "END") == 0 && --depth == 0) return;
      continue;
    }
    adv(l);
  }
}

static bool scan_number(TSLexer *l) {
  if (!is_digit(l->lookahead)) return false;
  bool only_decimal = true;
  while (is_hex(l->lookahead)) {
    if (!is_digit(l->lookahead)) only_decimal = false;
    adv(l);
  }
  if (l->lookahead == 'H' || l->lookahead == 'h') {
    adv(l);
    l->mark_end(l);
    return true;
  }
  l->mark_end(l);
  if (only_decimal && l->lookahead == '.') {
    adv(l);
    if (l->lookahead == '.') return true; // range: the token ends before ".."
    while (is_digit(l->lookahead)) adv(l);
    l->mark_end(l);
    if (l->lookahead == 'E' || l->lookahead == 'e') {
      adv(l);
      if (l->lookahead == '+' || l->lookahead == '-') adv(l);
      if (is_digit(l->lookahead)) {
        while (is_digit(l->lookahead)) adv(l);
        l->mark_end(l);
      }
    }
  }
  return true;
}

bool tree_sitter_modula2_external_scanner_scan(void *payload, TSLexer *l, const bool *valid) {
  (void)payload;
  while (is_space(l->lookahead)) l->advance(l, true);

  int32_t c = l->lookahead;

  if (c == '(' && valid[COMMENT]) {
    adv(l);
    if (l->lookahead != '*') return false;
    adv(l);
    skip_comment_body(l);
    l->mark_end(l);
    l->result_symbol = COMMENT;
    return true;
  }

  if (c == '<' && (valid[PRAGMA] || valid[INACTIVE_CODE])) {
    adv(l);
    if (l->lookahead != '*') return false;
    adv(l);
    while (is_space(l->lookahead)) adv(l);
    char w[16];
    read_word(l, w, sizeof w);
    skip_pragma_body(l);
    if (strcmp(w, "ELSE") == 0 || strcmp(w, "ELSIF") == 0) {
      skip_inactive(l, false);
      l->mark_end(l);
      l->result_symbol = INACTIVE_CODE;
      return true;
    }
    l->mark_end(l);
    l->result_symbol = PRAGMA;
    return true;
  }

  if (c == '%' && (valid[PRAGMA] || valid[INACTIVE_CODE])) {
    adv(l);
    char w[16];
    read_word(l, w, sizeof w);
    if (strcmp(w, "IF") == 0) {
      // condition up to %THEN
      char t[16];
      while (!l->eof(l)) {
        if (l->lookahead == '%') {
          adv(l);
          read_word(l, t, sizeof t);
          if (strcmp(t, "THEN") == 0) break;
        } else {
          adv(l);
        }
      }
      l->mark_end(l);
      l->result_symbol = PRAGMA;
      return true;
    }
    if (strcmp(w, "ELSE") == 0 || strcmp(w, "ELSIF") == 0) {
      skip_inactive(l, true);
      l->mark_end(l);
      l->result_symbol = INACTIVE_CODE;
      return true;
    }
    if (strcmp(w, "END") == 0) {
      l->mark_end(l);
      l->result_symbol = PRAGMA;
      return true;
    }
    return false;
  }

  if (valid[NUMBER] && is_digit(c)) {
    if (!scan_number(l)) return false;
    l->result_symbol = NUMBER;
    return true;
  }
  return false;
}
