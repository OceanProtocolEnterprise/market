import { VFile } from 'vfile'
import { matter } from 'vfile-matter'

export function parseFrontmatter(source: string): {
  data: Record<string, unknown> & { title?: string }
  content: string
} {
  const file = new VFile(source)
  matter(file, { strip: true })
  const parsed = file.data.matter
  const data =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}

  return {
    data: {
      ...data,
      ...(data.title !== undefined ? { title: String(data.title) } : {})
    },
    content: String(file)
  }
}
