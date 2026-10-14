import { parseFrontmatter } from './parseFrontmatter'

describe('parseFrontmatter', () => {
  it('extracts metadata and preserves the markdown body', () => {
    const source = '---\ntitle: Terms\ntags:\n  - legal\n---\n# Terms\n\nBody\n'
    expect(parseFrontmatter(source)).toEqual({
      data: { title: 'Terms', tags: ['legal'] },
      content: '# Terms\n\nBody\n'
    })
  })

  it('preserves content without frontmatter, including horizontal rules', () => {
    const source = '# Terms\n\n---\n\nBody\n'
    expect(parseFrontmatter(source)).toEqual({ data: {}, content: source })
  })

  it('handles empty metadata and Windows line endings', () => {
    expect(parseFrontmatter('---\r\n---\r\nBody')).toEqual({
      data: {},
      content: 'Body'
    })
  })

  it('rejects invalid YAML', () => {
    expect(() => parseFrontmatter('---\ntitle: [\n---\nBody')).toThrow()
  })

  it('normalizes non-object metadata and numeric titles', () => {
    expect(parseFrontmatter('---\n42\n---\nBody').data).toEqual({})
    expect(parseFrontmatter('---\ntitle: 2026\n---\nBody').data).toEqual({
      title: '2026'
    })
  })

  it.each(['title:', 'title: null', 'title: ~'])(
    'preserves a null title so pages can use their fallback: %s',
    (title) => {
      const { data } = parseFrontmatter(`---\n${title}\n---\nBody`)
      expect(data.title).toBeNull()
      expect(data.title || 'Terms').toBe('Terms')
    }
  )

  it('leaves a missing title absent', () => {
    expect(parseFrontmatter('---\ndescription: Terms\n---\nBody').data).toEqual(
      {
        description: 'Terms'
      }
    )
  })

  it('parses frontmatter after a leading UTF-8 BOM', () => {
    expect(parseFrontmatter('\uFEFF---\ntitle: Terms\n---\nBody')).toEqual({
      data: { title: 'Terms' },
      content: 'Body'
    })
  })

  it('removes only the leading BOM from plain markdown', () => {
    expect(parseFrontmatter('\uFEFF# Terms\n\nBody\uFEFF')).toEqual({
      data: {},
      content: '# Terms\n\nBody\uFEFF'
    })
  })
})
