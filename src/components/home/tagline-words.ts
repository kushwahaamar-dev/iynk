export type TaglinePiece = { text: string; word: boolean };

/**
 * Cuts a sentence into words and the spaces between them. Punctuation stays with the
 * word before it, so a full stop lights up with its word. Joining the texts gives the
 * input back.
 */
export function splitWords(text: string, locale: string): TaglinePiece[] {
  const pieces: TaglinePiece[] = [];
  const push = (chunk: string, wordLike: boolean) => {
    const last = pieces.at(-1);
    if (/^\s+$/.test(chunk)) pieces.push({ text: chunk, word: false });
    else if (!wordLike && last?.word) last.text += chunk;
    else pieces.push({ text: chunk, word: true });
  };

  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") {
    for (const chunk of text.split(/(\s+)/)) if (chunk) push(chunk, true);
    return pieces;
  }
  for (const { segment, isWordLike } of new Intl.Segmenter(locale, { granularity: "word" }).segment(text)) {
    push(segment, Boolean(isWordLike));
  }
  return pieces;
}
