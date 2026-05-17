/**
 * Dark, evenly hue-spread colours for distinguishing system components against
 * the light paper background. Hue spacing adapts to the component count to keep
 * contrast between adjacent colours maximal.
 */
export const componentColors = (count: number): ReadonlyArray<string> => {
  if (count <= 0) return [];
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const hue = Math.round((i * 360) / count);
    out.push(`hsl(${hue} 72% 34%)`);
  }
  return out;
};
