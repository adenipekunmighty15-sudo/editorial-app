export const BOOK_META = { title: 'Untitled', subtitle: '' }

/**
 * Normalises any book shape into [{ title, text }] chapters.
 * Markdown-style "# Heading" lines in a manuscript string start new chapters.
 * Returns [] when the book has no text yet.
 */
export function getBookSource(book) {
  if (Array.isArray(book?.pages) && book.pages.length) {
    const chapters = []
    book.pages.forEach((page) => {
      const body = String(
        typeof page === 'string' ? page : page?.body || page?.content || page?.text || '',
      ).trim()
      if (!body) return
      const title = typeof page === 'object' ? page.chapter || page.title || '' : ''
      const last = chapters[chapters.length - 1]
      if (last && (!title || title === last.title)) last.text += `\n\n${body}`
      else chapters.push({ title, text: body })
    })
    if (chapters.length) return chapters
  }

  const manuscript = book?.content || book?.body
  if (typeof manuscript === 'string' && manuscript.trim()) {
    const chapters = []
    let current = { title: '', text: '' }
    manuscript.split('\n').forEach((line) => {
      const heading = line.match(/^#{1,2}\s+(.+)$/)
      if (heading) {
        if (current.text.trim() || current.title) chapters.push(current)
        current = { title: heading[1].trim(), text: '' }
      } else {
        current.text += `${line}\n`
      }
    })
    if (current.text.trim() || current.title) chapters.push(current)
    return chapters.map((c) => ({ title: c.title, text: c.text.trim() })).filter((c) => c.text)
  }

  return []
}
