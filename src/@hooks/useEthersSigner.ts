// hooks/useEthersSigner.ts
import { BrowserProvider, JsonRpcSigner } from 'ethers'
import { useMemo, useSyncExternalStore } from 'react'
import type { Client, Transport, Chain, Account } from 'viem'
import { type Config, useAccount, useChainId, useConnectorClient } from 'wagmi'
import {
  getActiveDfnsEoaSigner,
  subscribeToActiveDfnsEoaSigner
} from '@utils/wallet/dfnsEoaSigner'

function clientToSigner(
  client: Client<Transport, Chain, Account>
): JsonRpcSigner {
  const { account, chain, transport } = client as any
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address
  }

  const provider = new BrowserProvider(transport, network)
  const signer = new JsonRpcSigner(provider, account?.address)

  return signer
}

export function useEthersSigner() {
  const chainId = useChainId()
  const { connector } = useAccount()
  const { data } = useConnectorClient<Config>({ chainId })
  const activeDfnsSigner = useSyncExternalStore(
    subscribeToActiveDfnsEoaSigner,
    getActiveDfnsEoaSigner,
    () => undefined
  )

  return useMemo(() => {
    if (connector?.id === 'dfns') {
      return activeDfnsSigner
    }

    return data
      ? clientToSigner(data as Client<Transport, Chain, Account>)
      : undefined
  }, [activeDfnsSigner, connector?.id, data])
}
