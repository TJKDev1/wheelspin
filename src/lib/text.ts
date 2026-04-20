export function truncateText(
  ctx: Pick<CanvasRenderingContext2D, "measureText">,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  const words = text.split(/\s+/);
  if (words.length > 1) {
    let truncated = "";
    for (const word of words) {
      const test = truncated ? truncated + " " + word : word;
      if (ctx.measureText(test + "\u2026").width <= maxWidth) {
        truncated = test;
      } else {
        break;
      }
    }
    if (truncated) return truncated + "\u2026";
  }

  let truncated = text;
  while (
    truncated.length > 1 &&
    ctx.measureText(truncated + "\u2026").width > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }

  return (truncated || text.charAt(0)) + "\u2026";
}
