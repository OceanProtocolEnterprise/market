import { ReactElement } from 'react'
import AddToken from '@components/@shared/AddToken'
import { useMarketMetadata } from '@context/MarketMetadata'
import { EUROeLogoIcon, OceanLogoIcon } from '@components/@shared/Icons'

const tokenLogos = {
  EUROe: {
    image: <EUROeLogoIcon />,
    url: 'https://dev.euroe.com/img/EUROe_Symbol_Black.svg'
  },
  OCEAN: {
    image: <OceanLogoIcon />,
    url: 'https://raw.githubusercontent.com/oceanprotocol/art/main/logo/token.png'
  }
}

export default function AddTokenList(): ReactElement {
  const { approvedBaseTokens } = useMarketMetadata()

  return (
    <div>
      {approvedBaseTokens?.map((token) => (
        <AddToken
          key={token.address}
          address={token.address}
          symbol={token.symbol}
          decimals={token.decimals}
          logo={tokenLogos?.[token.symbol]}
        />
      ))}
    </div>
  )
}
