import axios from 'axios'
import appConfig from 'app.config'
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
    let response = await axios.get(
      `${appConfig.ssiWalletApi}/wallet-api/auth/account/web3/nonce`
    )

    const nonce = response.data
    const payload = {
      challenge: nonce,
      signed: await owner.signMessage(nonce),
      publicKey: await owner.getAddress()
    }

    response = await axios.post(
      `${appConfig.ssiWalletApi}/wallet-api/auth/account/web3/signed`,
      payload
    )
    return response.data
  } catch (error) {
    throw new Error(error.response?.statusText)
  }
}

export async function disconnectFromWallet() {
  try {
    await axios.post(`${appConfig.ssiWalletApi}/wallet-api/auth/logout`)
  } catch (error) {
    throw new Error(error.response?.statusText)
  }
}

export async function getAccessToken(): Promise<string> {
  try {
    const response = await axios.get(
      `${appConfig.ssiWalletApi}/wallet-api/auth/session`,
      { withCredentials: true }
    )

    const result: { token: { accessToken: string } } = response.data
    return result.token.accessToken
  } catch (error) {
    throw new Error(error.response?.statusText)
  }
}

export async function getWallets(): Promise<SsiWalletDesc[]> {
  try {
    const response = await axios.get(
      `${appConfig.ssiWalletApi}/wallet-api/wallet/accounts/wallets`,
      { withCredentials: true }
    )

    const result: { wallets: SsiWalletDesc[] } = response.data
    return result.wallets
  } catch (error) {
    throw new Error(error.response?.statusText)
  }
}

export async function getWalletKeys(
  wallet: SsiWalletDesc
): Promise<SsiKeyDesc[]> {
  try {
    const response = await axios.get(
      `${appConfig.ssiWalletApi}/wallet-api/wallet/${wallet?.id}/keys`,
      { withCredentials: true }
    )

    return response.data
  } catch (error) {
    throw new Error(error.response?.statusText)
  }
}

export async function signMessage(
  walletId: string,
  keyId: string,
  message: any
) {
  try {
    const response = await axios.post(
      `${appConfig.ssiWalletApi}/wallet-api/wallet/${walletId}/keys/${keyId}/sign`,
      message,
      { withCredentials: true }
    )

    return response.data
  } catch (error) {
    console.log(error)
    throw new Error(error.response?.statusText)
  }
}
