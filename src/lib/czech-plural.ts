export function czechPlural(count: number, forms: [string, string, string]): string {
  if (count === 1) return `1 ${forms[0]}`
  if (count >= 2 && count <= 4) return `${count} ${forms[1]}`
  return `${count} ${forms[2]}`
}
