import { ReactElement } from 'react'
import Publish from '../../components/Publish'
import Page from '@shared/Page'
import content from '../../../content/publish/index.json'
import router from 'next/router'
import { GetServerSideProps } from 'next'
import { withAuth } from '@utils/auth/withAuth' // Assuming correct path

export default function PagePublish(): ReactElement {
  const { title, description } = content

  return (
    <Page
      title={title}
      description={description}
      uri={router.route}
      noPageHeader
    >
      <Publish content={content} />
    </Page>
  )
}

// ----------------------------------------------------
// Authentication Guard
// ----------------------------------------------------
export const getServerSideProps: GetServerSideProps = withAuth()
