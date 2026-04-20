export function getEntriesHash(entries: string[]): string {
  return entries.length + "|" + entries.join("\x00");
}

export function segmentNeedsDarkText(color: string): boolean {
  const pctMatch = color.match(/oklch\(\s*(\d+(?:\.\d+)?)%/);
  const pctLightness = pctMatch?.[1];
  if (pctLightness) return parseFloat(pctLightness) >= 70;

  const unitMatch = color.match(/oklch\(\s*(0?\.\d+|\d+(?:\.\d+)?)\s/);
  const unitLightness = unitMatch?.[1];
  if (unitLightness) return parseFloat(unitLightness) >= 0.7;

  return false;
}
