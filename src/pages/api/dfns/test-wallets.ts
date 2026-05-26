// pages/api/dfns/test-wallets.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { DFNS_CONFIG } from '../../../@lib/dfns'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = req.cookies.dfns_token

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const runTest = async (name: string, testFn: () => Promise<any>) => {
    try {
      const result = await testFn()
      return { name, success: true, data: result }
    } catch (error) {
      return {
        name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  try {
    const tests = []

    // Test 1: List all wallets
    const walletsRes = await fetch(`${DFNS_CONFIG.baseUrl}/wallets`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const wallets = await walletsRes.json()
    tests.push({ name: 'List Wallets', success: true, data: wallets })

    // Test 2-4: Run for each Ethereum Sepolia wallet
    const ethWallets =
      wallets.wallets?.filter(
        (w: any) =>
          w.network === 'eth-sepolia' || w.network === 'ethereum-sepolia'
      ) || []

    for (const wallet of ethWallets.slice(0, 2)) {
      // Test first 2 wallets
      // Get balances
      const balanceRes = await fetch(
        `${DFNS_CONFIG.baseUrl}/wallets/${wallet.id}/balances`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      const balances = await balanceRes.json()
      tests.push({
        name: `Balances - ${wallet.name}`,
        success: true,
        data: balances
      })

      // Get recent transactions
      const txRes = await fetch(
        `${DFNS_CONFIG.baseUrl}/wallets/${wallet.id}/transactions?limit=5`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      const transactions = await txRes.json()
      tests.push({
        name: `Transactions - ${wallet.name}`,
        success: true,
        data: transactions
      })
    }

    return res.status(200).json({
      success: true,
      tests,
      summary: {
        total: tests.length,
        passed: tests.filter((t) => t.success).length,
        failed: tests.filter((t) => !t.success).length
      }
    })
  } catch (error) {
    console.error('Test suite error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test execution failed'
    })
  }
}
