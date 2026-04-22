const ELLIPSIS = "\u2026";

function fits(
  ctx: Pick<CanvasRenderingContext2D, "measureText">,
  text: string,
  maxWidth: number,
): boolean {
  return ctx.measureText(text).width <= maxWidth;
}

function truncateByCharacters(
  ctx: Pick<CanvasRenderingContext2D, "measureText">,
  text: string,
  maxWidth: number,
): string {
  let low = 1;
  let high = text.length;
  let best = text.charAt(0);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid);

    if (fits(ctx, candidate + ELLIPSIS, maxWidth)) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best + ELLIPSIS;
}

export function truncateText(
  ctx: Pick<CanvasRenderingContext2D, "measureText">,
  text: string,
  maxWidth: number,
): string {
  if (fits(ctx, text, maxWidth)) return text;

  const words = text.split(/\s+/);
  if (words.length > 1) {
    let truncated = "";
    for (const word of words) {
      const candidate = truncated ? `${truncated} ${word}` : word;
      if (fits(ctx, candidate + ELLIPSIS, maxWidth)) {
        truncated = candidate;
      } else {
        break;
      }
    }
    if (truncated) return truncated + ELLIPSIS;
  }

  return truncateByCharacters(ctx, text, maxWidth);
}
