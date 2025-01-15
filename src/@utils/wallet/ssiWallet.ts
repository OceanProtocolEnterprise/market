import axios from 'axios'
import appConfig from 'app.config'
import {
  SsiKeyDesc,
  SsiWalletDesc,
  SsiWalletSession
} from 'src/@types/SsiWallet'

export async function connectToWallet(): Promise<SsiWalletSession> {
  try {
    const response = await axios.post(
      `${appConfig.ssiWalletApi}/wallet-api/auth/login`,
      { type: 'email', email: 'd.simon@gmx.org', password: 'test' }
    )
    console.log(response.data)
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
    console.log(error)
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
    console.log(error)
    throw new Error(error.response?.statusText)
  }
}

export async function getWalletKeys(walletId: string): Promise<SsiKeyDesc[]> {
  try {
    const response = await axios.get(
      `${appConfig.ssiWalletApi}/wallet-api/wallet/${walletId}/keys`,
      { withCredentials: true }
    )

    return response.data
  } catch (error) {
    console.log(error)
    throw new Error(error.response?.statusText)
  }
}
