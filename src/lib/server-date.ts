function isValidDate(value: Date) {
  return !Number.isNaN(value.getTime())
}

export function parseStoredDate(value: string) {
  const parsed = new Date(value)
  return isValidDate(parsed) ? parsed : null
}

export function parseInputDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00.000Z`)
    return isValidDate(parsed) ? parsed : null
  }

  return parseStoredDate(trimmed)
}
