import { ReactElement } from 'react'
import Page from '@shared/Page'
import PageHeader from '@shared/Page/PageHeader'
import router from 'next/router'
import Bookmarks from '@components/Bookmarks'
import content from '../../content/pages/bookmarks.json'
import styles from './bookmarks.module.css'

export default function PageBookmarks(): ReactElement {
  const { title, description } = content

  return (
    <Page
      title={title}
      description={description}
      uri={router.route}
      noPageHeader
    >
      <div className={styles.headerWrapper}>
        <PageHeader title={title} description={description} isExtended />
      </div>
      <Bookmarks />
    </Page>
  )
}
