import { ReactElement } from 'react'
import { useRouter } from 'next/router'
import EditPage from '../../../components/Asset/Edit'
import AssetProvider from '@context/Asset'
import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { AuthRequiredProps, withAuth } from '@utils/auth/withAuth'

interface PageEditAssetProps extends AuthRequiredProps {
  did: string
}

export default function PageEditAsset({
  session,
  did
}: PageEditAssetProps): ReactElement {
  const router = useRouter()

  if (session) {
    console.log('User is authenticated for editing:', session.user?.email)
  }

  return (
    <AssetProvider did={did}>
      <EditPage uri={router.pathname} />
    </AssetProvider>
  )
}

// ----------------------------------------------------
// Page-Specific SSR Logic
// ----------------------------------------------------
const editAssetSsr: GetServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const did = context.query.did as string
  return {
    props: {
      did
    }
  }
}

export const getServerSideProps: GetServerSideProps = withAuth(editAssetSsr)
