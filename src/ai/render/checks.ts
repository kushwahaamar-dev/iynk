export type OutputFlag = "claim_unapplied" | "wording" | "unsourced_number";

type Flag = { kind: OutputFlag; start: number; end: number };

type CheckContext = {
  packText: string;
  toolTexts: readonly string[];
  /** The partner changes nothing itself; a proposal is applied only by the person. */
  changed: false;
};

type Language = {
  /** Phrases that say the partner already changed something. */
  claims: readonly RegExp[];
  /** Both are global so matchAll can find every position. */
  overstated: RegExp;
  simulation: RegExp;
};

const LANGUAGES: readonly Language[] = [
  {
    claims: [
      /\bI(?:'ve| have)?\s+(?:changed|updated|added|removed|replaced|rewired|fixed)\b/i,
      /\bdone,?\s+the\s+\w+\s+is\s+now\b/i,
    ],
    overstated: /\b(?:validated|verified against hardware|accurate|exact|real)\b/gi,
    simulation: /simulat/gi,
  },
  {
    claims: [
      /\b(?:he|ya\s+he)\s+(?:cambiado|actualizado|añadido|agregado|quitado|eliminado|reemplazado)\b/i,
      /\blisto,?\s+(?:el|la)\s+\w+\s+(?:ahora\s+)?(?:está|es)\b/i,
    ],
    overstated: /\b(?:validad[oa]|verificad[oa] (?:con|en) (?:el )?hardware|precis[oa]|exact[oa]|real)\b/gi,
    simulation: /simulaci|simulad/gi,
  },
  {
    claims: [
      /\bj['’](?:ai)\s+(?:changé|modifié|mis à jour|ajouté|supprimé|retiré|remplacé)\b/i,
      /\bc['’]est fait,?\s+(?:le|la|l['’])\s*\w+\s+est\s+maintenant\b/i,
    ],
    overstated: /\b(?:validée?|vérifiée? (?:sur|avec) (?:le )?matériel|précis[e]?|exact[e]?|réel[le]*)\b/gi,
    simulation: /simulat/gi,
  },
  {
    claims: [
      /\bich\s+habe\b[^.!?]{0,40}\b(?:geändert|aktualisiert|hinzugefügt|entfernt|ersetzt)\b/i,
      /\bfertig,?\s+\w+\s+\w+\s+ist\s+jetzt\b/i,
    ],
    overstated: /\b(?:validiert|an der hardware verifiziert|genau|exakt|echt|real)\b/gi,
    simulation: /simulation|simuliert/gi,
  },
  {
    claims: [/我(?:已经|已|刚刚|刚)?(?:修改|更改|更新|添加|删除|移除|替换)了/, /好了[，,]\S{0,8}现在/],
    overstated: /已验证|验证过|准确|精确|真实/g,
    simulation: /模拟|仿真/g,
  },
  {
    claims: [/मैंने[^।.!?]{0,40}(?:बदल|जोड़|हटा|अपडेट)/, /हो गया[,，]?\s*\S+\s+अब/],
    overstated: /सत्यापित|सटीक|वास्तविक/g,
    simulation: /सिमुलेशन/g,
  },
];

const NEAR = 80;
const SENTENCE = /[^.!?。！？।\n]+[.!?。！？।]*/g;
const MEASURE = /(\d+(?:[.,]\d+)?)\s?(?:mA|µA|uA|kΩ|MΩ|Ω|ohms?|kHz|MHz|GHz|Hz|mV|V|mW|W|ms|µs|us|ns|kB|MB|°C|%|A)(?![A-Za-zΩµ])/g;

function isNear(text: string, a: RegExp, b: RegExp): boolean {
  const first = [...text.matchAll(a)];
  const second = [...text.matchAll(b)];
  return first.some((x) => second.some((y) => Math.abs(x.index - y.index) <= NEAR));
}

function hasNumber(haystack: string, digits: string): boolean {
  const bare = digits.replace(",", ".");
  return new RegExp(`(?<![\\d.,])${bare.replace(".", "[.,]")}(?![\\d])`).test(haystack);
}

/** Marks sentences that overstate what the partner did or knows. It never blocks or rewrites an answer. */
export function checkAnswer(
  text: string,
  ctx: CheckContext,
): { flags: Flag[]; appendNote: "nothingChanged" | null } {
  const sources = [ctx.packText, ...ctx.toolTexts].join("\n");
  const flags: Flag[] = [];
  let claimed = false;

  for (const match of text.matchAll(SENTENCE)) {
    const sentence = match[0];
    const start = match.index;
    const end = start + sentence.length;

    if (LANGUAGES.some((l) => l.claims.some((claim) => claim.test(sentence)))) {
      claimed = true;
      flags.push({ kind: "claim_unapplied", start, end });
    }
    if (LANGUAGES.some((l) => isNear(sentence, l.simulation, l.overstated))) {
      flags.push({ kind: "wording", start, end });
    }
    for (const measure of sentence.matchAll(MEASURE)) {
      if (!hasNumber(sources, measure[1])) {
        flags.push({ kind: "unsourced_number", start, end });
        break;
      }
    }
  }

  return { flags, appendNote: claimed && !ctx.changed ? "nothingChanged" : null };
}
