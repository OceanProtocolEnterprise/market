import axios from 'axios'
import {
  SsiKeyDesc,
  SsiWalletDesc,
  SsiWalletSession
} from 'src/@types/SsiWallet'
import { Signer } from 'ethers'

export async function connectToWallet(
  owner: Signer
): Promise<SsiWalletSession> {
  try {
    let response = await axios.get(`/ssi/wallet-api/auth/account/web3/nonce`)

    const nonce = response.data
    const payload = {
      challenge: nonce,
      signed: await owner.signMessage(nonce),
      publicKey: await owner.getAddress()
    }

    response = await axios.post(
      `/ssi/wallet-api/auth/account/web3/signed`,
      payload
    )

    return response.data?.sessionToken
  } catch (error) {
    throw error.response
  }
}

export async function disconnectFromWallet() {
  try {
    await axios.post(`/ssi/wallet-api/auth/logout`)
  } catch (error) {
    throw error.response
  }
}

export async function isSessionValid(): Promise<boolean> {
  try {
    await axios.get(`/ssi/wallet-api/auth/session`, {
      withCredentials: true
    })

    return true
  } catch (error) {
    return false
  }
}

export async function getWallets(): Promise<SsiWalletDesc[]> {
  try {
    const response = await axios.get(
      `/ssi/wallet-api/wallet/accounts/wallets`,
      { withCredentials: true }
    )

    const result: { wallets: SsiWalletDesc[] } = response.data
    return result.wallets
  } catch (error) {
    throw error.response
  }
}

export async function getWalletKeys(
  wallet: SsiWalletDesc
): Promise<SsiKeyDesc[]> {
  try {
    const response = await axios.get(
      `/ssi/wallet-api/wallet/${wallet?.id}/keys`,
      { withCredentials: true }
    )

    return response.data
  } catch (error) {
    throw error.response
  }
}

export async function getWalletKey(walletId: string, keyId: string) {
  try {
    const response = await axios.post(
      `/ssi/wallet-api/wallet/${walletId}/keys/${keyId}/load`,
      { withCredentials: true }
    )

    return response.data
  } catch (error) {
    throw error.response
  }
}

export async function signMessage(
  walletId: string,
  keyId: string,
  message: any
) {
  try {
    const response = await axios.post(
      `/ssi/wallet-api/wallet/${walletId}/keys/${keyId}/sign`,
      message,
      { withCredentials: true }
    )

    return response.data
  } catch (error) {
    throw error.response
  }
}
