import axios from 'axios'
import appConfig from 'app.config'

export interface SsiSession {
  id: string
  username: string
  token: string
}

export async function connectToSsiWallet(): Promise<SsiSession> {
  if (appConfig.ssiWalletApi?.length === 0) {
    throw new Error('NEXT_PUBLIC_SSI_WALLET_API not set')
  }
  const response = await axios.post(
    `${appConfig.ssiWalletApi}/wallet-api/auth/login`,
    { type: 'email', email: 'd.simon@gmx.org', password: 'test' }
  )
  if (response.status !== 200) {
    throw new Error(response.statusText)
  }

  return response.data
}

export async function disconnectFromSsiWallet() {
  if (appConfig.ssiWalletApi?.length === 0) {
    throw new Error('NEXT_PUBLIC_SSI_WALLET_API not set')
  }
  const response = await axios.post(
    `${appConfig.ssiWalletApi}/wallet-api/auth/logout`
  )
  if (response.status !== 200) {
    throw new Error(response.statusText)
  }
}

export async function getSsiWalletAccessToken(): Promise<string> {
  if (appConfig.ssiWalletApi?.length === 0) {
    throw new Error('NEXT_PUBLIC_SSI_WALLET_API not set')
  }
  const response = await axios.get(
    `${appConfig.ssiWalletApi}/wallet-api/auth/session`,
    { withCredentials: true }
  )
  if (response.status !== 200) {
    throw new Error(response.statusText)
  }

  const result: { token: { accessToken: string } } = response.data
  return result?.token?.accessToken
}
