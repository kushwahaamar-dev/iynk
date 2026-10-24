// A small, dependency-free highlighter for read-only snippets: Arduino C++,
// MicroPython, Verilog, Betaflight CLI, ArduPilot parameters and shell.

export type CodeLang = "cpp" | "python" | "verilog" | "cli" | "params" | "bash" | "text";
export type TokenKind = "kw" | "ty" | "str" | "fn" | "con" | "pp" | "cm" | "num" | "plain";
export type Token = { kind: TokenKind; text: string };

const words = (list: string) => new Set(list.split(" "));

const CPP_KW = words(
  "if else for while do switch case default break continue return goto sizeof new delete class struct enum union public private protected virtual static const constexpr volatile extern inline typedef namespace using template typename operator this nullptr auto",
);
const CPP_TY = words(
  "void int long short char bool float double unsigned signed byte word boolean size_t String uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t Servo",
);
const CPP_CON = words(
  "HIGH LOW INPUT OUTPUT INPUT_PULLUP INPUT_PULLDOWN LED_BUILTIN true false NULL CHANGE RISING FALLING A0 A1 A2 A3 A4 A5 A6 A7 MSBFIRST LSBFIRST DEC HEX BIN",
);
const PY_KW = words(
  "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield",
);
const PY_TY = words("int float str bool bytes list dict tuple set range print len self");
const V_KW = words(
  "module endmodule input output inout wire reg logic integer parameter localparam assign always always_ff always_comb initial begin end if else case casez casex endcase default posedge negedge or and not for generate endgenerate genvar function endfunction task endtask signed",
);
const CLI_KW = words(
  "set get save diff dump defaults resource feature map serial aux profile rateprofile batch status version mixer mmix smix beeper vtxtable timer dma tasks exit led color mode_color adjrange rxrange vtx",
);

type Rule = [TokenKind | "word", RegExp];

const NUM = /0[xX][0-9a-fA-F]+[uUlL]*|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[fFuUlL]*/;

const RULES: Record<Exclude<CodeLang, "text">, Rule[]> = {
  cpp: [
    ["cm", /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/],
    ["pp", /#\s*[a-z]+(?:[ \t]+<[^>\n]*>)?/],
    ["str", /"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/],
    ["num", NUM],
    ["word", /[A-Za-z_]\w*/],
  ],
  python: [
    ["cm", /#[^\n]*/],
    ["str", /[rbfRBF]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)/],
    ["pp", /@[A-Za-z_][\w.]*/],
    ["num", NUM],
    ["word", /[A-Za-z_]\w*/],
  ],
  verilog: [
    ["cm", /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/],
    ["pp", /`[A-Za-z_]\w*|\$[A-Za-z_]\w*/],
    ["str", /"(?:\\.|[^"\\\n])*"?/],
    ["num", /\d*'[sS]?[bBoOdDhH][0-9a-fA-FxXzZ_?]+|\d[\d_]*(?:\.\d+)?/],
    ["word", /[A-Za-z_]\w*/],
  ],
  cli: [
    ["cm", /#[^\n]*/],
    ["num", /-?\d+(?:\.\d+)?/],
    ["word", /[A-Za-z_][\w-]*/],
  ],
  params: [
    ["cm", /#[^\n]*/],
    ["num", /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/],
    ["word", /[A-Za-z_]\w*/],
  ],
  bash: [
    ["cm", /#[^\n]*/],
    ["str", /"(?:\\.|[^"\\])*"?|'[^']*'?/],
    ["con", /\$\{?[A-Za-z_]\w*\}?/],
    ["num", /\b\d+(?:\.\d+)?\b/],
    ["word", /[A-Za-z_][\w.-]*/],
  ],
};

function classifyWord(lang: CodeLang, word: string, next: string, lineStart: boolean): TokenKind {
  switch (lang) {
    case "cpp":
      if (CPP_KW.has(word)) return "kw";
      if (CPP_TY.has(word)) return "ty";
      if (CPP_CON.has(word)) return "con";
      return /^\s*\(/.test(next) ? "fn" : "plain";
    case "python":
      if (PY_KW.has(word)) return "kw";
      if (PY_TY.has(word)) return "ty";
      return /^\s*\(/.test(next) ? "fn" : "plain";
    case "verilog":
      return V_KW.has(word) ? "kw" : "plain";
    case "cli":
      if (lineStart && CLI_KW.has(word)) return "kw";
      if (/^(?:ON|OFF)$/.test(word)) return "con";
      return /^[A-Z][A-Z0-9_]+$/.test(word) ? "con" : "plain";
    case "params":
      return lineStart || /^[A-Z][A-Z0-9_]{2,}$/.test(word) ? "kw" : "plain";
    case "bash":
      return lineStart ? "fn" : "plain";
    default:
      return "plain";
  }
}

/** Splits `code` into tokens; joining every token's text gives `code` back. */
export function tokenize(code: string, lang: CodeLang): Token[] {
  if (lang === "text") return [{ kind: "plain", text: code }];
  const rules = RULES[lang];
  const sticky = rules.map(([kind, re]) => [kind, new RegExp(re.source, "y")] as const);
  const out: Token[] = [];
  let plain = "";
  let i = 0;
  const flush = () => {
    if (plain) out.push({ kind: "plain", text: plain });
    plain = "";
  };
  while (i < code.length) {
    let matched = false;
    for (const [kind, re] of sticky) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (!m || m[0].length === 0) continue;
      const text = m[0];
      const before = code.slice(code.lastIndexOf("\n", i - 1) + 1, i);
      const lineStart = /^\s*$/.test(before) || (lang === "params" && /^\s*param\s+set\s+$/.test(before));
      const tokenKind = kind === "word" ? classifyWord(lang, text, code.slice(i + text.length, i + text.length + 3), lineStart) : kind;
      flush();
      out.push({ kind: tokenKind, text });
      i += text.length;
      matched = true;
      break;
    }
    if (!matched) {
      plain += code[i];
      i += 1;
    }
  }
  flush();
  return out;
}

/** The tokens grouped by line, with tokens that span lines split at "\n". */
export function tokenLines(code: string, lang: CodeLang): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokenize(code, lang)) {
    const parts = token.text.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ kind: token.kind, text: part });
    });
  }
  return lines;
}
