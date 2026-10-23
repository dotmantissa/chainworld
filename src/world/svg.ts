export function svgDataUri(svg:string):string {
  return `data:image/svg+xml;base64,${btoa(Array.from(new TextEncoder().encode(svg),byte=>String.fromCharCode(byte)).join(''))}`
}
