import { ReactElement, useState } from 'react'
import { useRouter } from 'next/router'
import PageTemplateAssetDetails from '../../../components/Asset'
import AssetProvider from '@context/Asset'
import ProfileProvider from '@context/Profile'
import { useAccount } from 'wagmi'
import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { AuthRequiredProps, withAuth } from '@utils/auth/withAuth'

interface PageAssetDetailsProps extends AuthRequiredProps {
  did: string
}

export default function PageAssetDetails({
  did
}: PageAssetDetailsProps): ReactElement {
  const router = useRouter()

  const { address: accountId } = useAccount()
  const [ownAccount] = useState(false)

  return (
    <ProfileProvider accountId={accountId} ownAccount={ownAccount}>
      <AssetProvider did={did}>
        <PageTemplateAssetDetails uri={router.asPath} />
      </AssetProvider>
    </ProfileProvider>
  )
}

// ----------------------------------------------------
// Page-Specific SSR Logic
// ----------------------------------------------------

const assetDetailsSsr: GetServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const did = context.query.did as string

  return {
    props: {
      did
    }
  }
}
export const getServerSideProps: GetServerSideProps = withAuth(assetDetailsSsr)
