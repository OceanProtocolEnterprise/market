import { remark } from 'remark'
import remarkHtml from 'remark-html'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkToc from 'remark-toc'

interface MarkdownToHtmlOptions {
  openLinksInNewTab?: boolean
}

interface RehypeElement {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: RehypeElement[]
}

function rehypeNewTabLinks() {
  return (tree: RehypeElement) => {
    function visit(node: RehypeElement) {
      if (node.type === 'element' && node.tagName === 'a') {
        node.properties = {
          ...node.properties,
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }

      node.children?.forEach(visit)
    }

    visit(tree)
  }
}

export function markdownToHtml(
  markdown: string,
  options: MarkdownToHtmlOptions = {}
): string {
  if (options.openLinksInNewTab) {
    const result = remark()
      .use(remarkGfm)
      .use(remarkBreaks)
      .use(remarkRehype)
      .use(rehypeNewTabLinks)
      .use(rehypeStringify)
      .processSync(markdown)

    return result.toString()
  }

  const result = remark()
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkHtml) // serializes through remark-rehype and rehype-stringify
    .processSync(markdown)

  return result.toString()
}

export function markdownToHtmlWithToc(markdown: string): string {
  const result = remark()
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkToc)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .processSync(markdown)

  return result.toString()
}
