import { markdownToHtml } from '@utils/markdown'
import { ReactElement } from 'react'
import styles from './index.module.css'

const Markdown = ({
  text,
  blockImages,
  className,
  openLinksInNewTab
}: {
  text: string
  blockImages?: boolean
  className?: string
  openLinksInNewTab?: boolean
}): ReactElement => {
  const html = markdownToHtml(text, { openLinksInNewTab })
  const content = !blockImages
    ? html
    : html.replaceAll(
        /<img[\w\W]+?\/?>/g,
        `<img src="/images/image_blocked_placeholder.png" alt="Blocked image placeholder" class="${styles.blockedContentImage}" />`
      )

  return (
    <div
      className={[styles.markdown, className].filter(Boolean).join(' ')}
      // Note: We serialize and kill all embedded HTML over in markdownToHtml()
      // so the danger here is gone.
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

export default Markdown
