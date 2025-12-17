import { ReactElement, useState } from 'react'
import Search from '../components/Search'
import Page from '@shared/Page'
import { accountTruncate } from '@utils/wallet'
import { MAXIMUM_NUMBER_OF_PAGES_WITH_RESULTS } from '@utils/aquarius'
import { useRouter } from 'next/router'
import { isAddress } from 'ethers'
import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { AuthRequiredProps, withAuth } from '@utils/auth/withAuth'

interface PageSearchProps extends AuthRequiredProps {
  query: any
}

export default function PageSearch({ query }: PageSearchProps): ReactElement {
  const router = useRouter()

  // Use the query passed from SSR props instead of router.query for stability
  const { text, owner, tags, categories } = query
  const [totalResults, setTotalResults] = useState<number>()
  const [totalPagesNumber, setTotalPagesNumber] = useState<number>()

  const isETHAddress = isAddress(text as string)
  const searchValue =
    (isETHAddress ? accountTruncate(text as string) : text) ||
    tags ||
    categories

  const title = owner
    ? `Published by ${accountTruncate(owner as string)}`
    : `${
        totalResults !== undefined
          ? searchValue && searchValue !== ' '
            ? totalResults === 0
              ? 'No results'
              : totalResults +
                (totalResults > 1 ? ' results' : ' result') +
                ' for ' +
                searchValue
            : totalResults + ' results'
          : 'Searching...'
      }`

  return (
    <Page
      title={
        totalPagesNumber > MAXIMUM_NUMBER_OF_PAGES_WITH_RESULTS
          ? `>10000 results ${
              searchValue && searchValue !== ' ' ? `for ${searchValue}` : ''
            }`
          : title
      }
      description={
        totalPagesNumber &&
        totalPagesNumber > MAXIMUM_NUMBER_OF_PAGES_WITH_RESULTS
          ? '**Results displayed are limited to the first 10k, please refine your search.**'
          : undefined
      }
      uri={router.route}
    >
      <Search
        setTotalResults={setTotalResults}
        setTotalPagesNumber={setTotalPagesNumber}
      />
    </Page>
  )
}

// ----------------------------------------------------
// Page-Specific SSR Logic
// ----------------------------------------------------

const searchSsr: GetServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  return {
    props: {
      query: context.query
    }
  }
}

export const getServerSideProps: GetServerSideProps = withAuth(searchSsr)
