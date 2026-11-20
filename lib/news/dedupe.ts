// Remove repeated news items. Sources often republish the same story with a
// slightly different headline, so an item is a duplicate if it shares the link,
// the headline, or the opening of its description with an earlier item.
// Keeps the first occurrence (feeds are newest-first).

const norm = (s: unknown) =>
  String(s ?? '').toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export function dedupeNews<T extends { link?: string; title?: string; description?: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const keys = [
      item.link  ? 'l:' + String(item.link).split('?')[0].replace(/\/+$/, '').toLowerCase() : '',
      item.title ? 't:' + norm(item.title) : '',
      norm(item.description).length >= 60 ? 'd:' + norm(item.description).slice(0, 120) : '',
    ].filter(Boolean)
    if (keys.some(k => seen.has(k))) return false
    keys.forEach(k => seen.add(k))
    return true
  })
}
