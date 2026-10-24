import "server-only";

/**
 * The Colorfigures look for Muse Image (D10): hand-inked isometric objects on
 * warm paper, flat light/mid/dark bands, the five palette colours. The user's
 * prompt only names the subject; this template fixes everything else.
 */
export function colorfiguresImagePrompt(subject: string): string {
  return `Subject: ${subject.trim()}

Style, strictly: a hand-inked isometric illustration of objects, like a page from a colourful technical picture book. Every object is a real 3D body seen from a 30-degree isometric view, shaded in exactly three flat bands per colour (light top, mid side, dark side), with no gradients, no airbrush and no photographic lighting. A heavy, slightly wobbly black ink silhouette around each object, with finer ink lines for inner edges and details. Palette only: tomato (#ef6a4c, mid #cf5038), mustard (#f4b829, mid #d49c1f), mint (#93d3b0, mid #71b693), cobalt (#76a0e2, mid #5a82c6) and blush (#f3a6bb, mid #d8869c), each with a deep dark band; ink lines in #231e16; warm paper (#f2efe7) for the background; one flat cobalt-blue cast shadow under each object. Plenty of empty paper around the objects. No text, letters, numbers, logos, people or faces.`;
}
