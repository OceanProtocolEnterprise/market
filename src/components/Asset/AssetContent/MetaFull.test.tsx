import { render, screen } from '@testing-library/react'
import MetaFull from './MetaFull'
import { datasetAquarius } from '../../../../.jest/__fixtures__/datasetAquarius'
import { algorithmAquarius } from '../../../../.jest/__fixtures__/algorithmAquarius'

describe('src/components/Asset/AssetContent/MetaFull.tsx', () => {
  it('renders metadata', () => {
    render(<MetaFull ddo={datasetAquarius} />)
    expect(screen.getByText('Owner')).toBeInTheDocument()
  })

  it('renders metadata for an algorithm', () => {
    render(<MetaFull ddo={algorithmAquarius} />)
    expect(screen.getByText('Docker Image')).toBeInTheDocument()
    expect(screen.getByText('DID')).toBeInTheDocument()
  })

  it('renders the publisher DID when the issuer is available', () => {
    const issuer = 'did:ope:1234567890abcdef1234567890abcdef1234567890abcdef'

    render(<MetaFull ddo={{ ...datasetAquarius, issuer }} />)

    expect(screen.getByText('Publisher DID')).toBeInTheDocument()
    expect(screen.getByLabelText(issuer)).toBeInTheDocument()
  })

  it('does not render a docker image when an algorithm has no container', () => {
    const algorithmWithoutContainer = {
      ...algorithmAquarius,
      credentialSubject: {
        ...algorithmAquarius.credentialSubject,
        metadata: {
          ...algorithmAquarius.credentialSubject.metadata,
          algorithm: {
            ...algorithmAquarius.credentialSubject.metadata.algorithm,
            container: undefined
          }
        }
      }
    }

    render(<MetaFull ddo={algorithmWithoutContainer} />)

    expect(screen.queryByText('Docker Image')).not.toBeInTheDocument()
  })
})
