/* eslint-disable camelcase */
// pages/wallets.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  DfnsClient,
  Wallet,
  Transaction,
  TransactionRequest
} from '../@lib/dfns-client'

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [balances, setBalances] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<any[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [transactionForm, setTransactionForm] = useState<TransactionRequest>({
    to: '',
    amount: '',
    asset: 'ETH'
  })

  const getAuthToken = async () => {
    const response = await fetch('/api/dfns/get-token')
    const data = await response.json()
    return data.token
  }

  const dfnsClient = new DfnsClient(getAuthToken)

  const loadWalletDetails = async (wallet: Wallet) => {
    try {
      const [balancesData, transactionsData] = await Promise.all([
        dfnsClient.getWalletBalances(wallet.id),
        dfnsClient.listTransactions(wallet.id, 10)
      ])
      setBalances(balancesData)
      setTransactions(transactionsData.transactions || [])
    } catch (err) {
      console.error('Failed to load wallet details:', err)
    }
  }

  const loadWallets = async () => {
    setLoading(true)
    try {
      const { wallets: walletList } = await dfnsClient.listWallets()
      setWallets(walletList)

      // Filter Ethereum Sepolia wallets
      const ethSepoliaWallets = walletList.filter(
        (w) => w.network === 'eth-sepolia' || w.network === 'ethereum-sepolia'
      )

      if (ethSepoliaWallets.length > 0) {
        setSelectedWallet(ethSepoliaWallets[0])
        await loadWalletDetails(ethSepoliaWallets[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallets')
    } finally {
      setLoading(false)
    }
  }
  // Load initial data
  useEffect(() => {
    loadWallets()
  }, [])

  const handleWalletSelect = async (wallet: Wallet) => {
    setSelectedWallet(wallet)
    await loadWalletDetails(wallet)
  }

  // ============ Test Cases ============

  const runTest1_CheckPermissions = async () => {
    console.log('🧪 Test 1: Checking user permissions...')
    const user = await dfnsClient.getCurrentUser()
    const permissions = await dfnsClient.getUserPermissions()

    const hasReadWallets = await dfnsClient.checkPermission('wallets', 'read')
    const hasWriteWallets = await dfnsClient.checkPermission('wallets', 'write')
    const hasSignTransactions = await dfnsClient.checkPermission(
      'transactions',
      'sign'
    )

    return {
      name: 'User Permissions',
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        permissions,
        canReadWallets: hasReadWallets,
        canWriteWallets: hasWriteWallets,
        canSignTransactions: hasSignTransactions
      }
    }
  }

  const runTest2_ListWallets = async () => {
    console.log('🧪 Test 2: Listing all wallets...')
    const { wallets: walletList } = await dfnsClient.listWallets()
    return {
      name: 'List Wallets',
      success: true,
      data: {
        totalCount: walletList.length,
        wallets: walletList.map((w) => ({
          id: w.id,
          name: w.name,
          network: w.network,
          address: w.address,
          status: w.status
        }))
      }
    }
  }

  const runTest3_CheckBalances = async () => {
    if (!selectedWallet) {
      throw new Error('No wallet selected')
    }

    console.log(`🧪 Test 3: Checking balances for ${selectedWallet.name}...`)
    const balances = await dfnsClient.getWalletBalances(selectedWallet.id)
    const ethBalance = await dfnsClient.getWalletBalanceByAsset(
      selectedWallet.id,
      'ETH'
    )

    return {
      name: 'Wallet Balances',
      success: true,
      data: {
        wallet: selectedWallet.name,
        allBalances: balances.balances,
        ethBalance,
        hasSufficientEth: parseFloat(ethBalance.amount) > 0.001
      }
    }
  }

  const runTest4_EstimateGas = async () => {
    if (!selectedWallet) {
      throw new Error('No wallet selected')
    }

    console.log('🧪 Test 4: Estimating gas for transaction...')
    const estimation = await dfnsClient.estimateGas(selectedWallet.id, {
      to: selectedWallet.address,
      amount: '0.0001',
      asset: 'ETH'
    })

    return {
      name: 'Gas Estimation',
      success: true,
      data: {
        gasLimit: estimation.gasLimit,
        gasPrice: estimation.gasPrice,
        estimatedFeeEth: (
          (parseInt(estimation.gasLimit) * parseInt(estimation.gasPrice)) /
          1e18
        ).toFixed(6)
      }
    }
  }

  const runTest5_CreateTransaction = async () => {
    if (!selectedWallet) {
      throw new Error('No wallet selected')
    }

    console.log('🧪 Test 5: Creating test transaction...')
    const transfer = await dfnsClient.createTransfer(selectedWallet.id, {
      to: selectedWallet.address, // Send to self for testing
      amount: '0.00001',
      asset: 'ETH',
      note: 'Test transaction from Dfns dashboard'
    })

    return {
      name: 'Create Transaction',
      success: true,
      data: {
        transactionId: transfer.transaction.id,
        status: transfer.transaction.status,
        from: transfer.transaction.from,
        to: transfer.transaction.to,
        amount: transfer.transaction.amount
      },
      transactionId: transfer.transaction.id
    }
  }

  const runTest6_SignTransaction = async (transactionId: string) => {
    if (!selectedWallet) {
      throw new Error('No wallet selected')
    }

    console.log('🧪 Test 6: Signing transaction with passkey...')
    console.log(
      'Note: Dfns will automatically use the organization passkey for signing'
    )

    const signed = await dfnsClient.signTransaction(
      selectedWallet.id,
      transactionId
    )

    return {
      name: 'Sign Transaction',
      success: true,
      data: {
        transactionId,
        signedTransaction: signed.signedTransaction?.substring(0, 100) + '...'
      }
    }
  }

  const runTest7_BroadcastTransaction = async (transactionId: string) => {
    if (!selectedWallet) {
      throw new Error('No wallet selected')
    }

    console.log('🧪 Test 7: Broadcasting transaction to Ethereum Sepolia...')
    const broadcast = await dfnsClient.broadcastTransaction(
      selectedWallet.id,
      transactionId
    )

    return {
      name: 'Broadcast Transaction',
      success: true,
      data: {
        transactionId,
        status: broadcast.transaction.status,
        hash: broadcast.transaction.hash,
        explorerUrl: `https://sepolia.etherscan.io/tx/${broadcast.transaction.hash}`
      }
    }
  }

  const runTest8_WaitForConfirmation = async (transactionId: string) => {
    if (!selectedWallet) {
      throw new Error('No wallet selected')
    }

    console.log('🧪 Test 8: Waiting for transaction confirmation...')
    const confirmed = await dfnsClient.waitForTransactionConfirmation(
      selectedWallet.id,
      transactionId,
      30, // 30 attempts
      3000 // 3 seconds interval
    )

    return {
      name: 'Transaction Confirmation',
      success: confirmed.status === 'confirmed',
      data: {
        transactionId,
        status: confirmed.status,
        hash: confirmed.hash,
        confirmedAt: confirmed.confirmedAt,
        blockExplorer: `https://sepolia.etherscan.io/tx/${confirmed.hash}`
      }
    }
  }

  const runAllTests = async () => {
    if (!selectedWallet) {
      setError('Please select a wallet first')
      return
    }

    setIsRunningTests(true)
    setTestResults([])
    setError(null)

    const results: any[] = []
    let lastTransactionId: string | null = null

    try {
      // Run all tests in sequence
      results.push(await runTest1_CheckPermissions())
      results.push(await runTest2_ListWallets())
      results.push(await runTest3_CheckBalances())
      results.push(await runTest4_EstimateGas())

      const createResult = await runTest5_CreateTransaction()
      results.push(createResult)
      lastTransactionId = createResult.transactionId

      if (lastTransactionId) {
        const signResult = await runTest6_SignTransaction(lastTransactionId)
        results.push(signResult)

        const broadcastResult = await runTest7_BroadcastTransaction(
          lastTransactionId
        )
        results.push(broadcastResult)

        const confirmResult = await runTest8_WaitForConfirmation(
          lastTransactionId
        )
        results.push(confirmResult)
      }

      // Refresh wallet details after tests
      await loadWalletDetails(selectedWallet)

      setTestResults(results)
      console.log('✅ All tests completed!', results)
    } catch (err) {
      console.error('Test failed:', err)
      setError(err instanceof Error ? err.message : 'Test execution failed')
      results.push({
        name: 'Test Execution',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
      setTestResults(results)
    } finally {
      setIsRunningTests(false)
    }
  }

  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWallet) return

    setLoading(true)
    try {
      // Estimate gas first
      const estimation = await dfnsClient.estimateGas(selectedWallet.id, {
        to: transactionForm.to,
        amount: transactionForm.amount,
        asset: transactionForm.asset
      })

      // Create transaction
      const transfer = await dfnsClient.createTransfer(selectedWallet.id, {
        ...transactionForm,
        gasLimit: estimation.gasLimit,
        gasPrice: estimation.gasPrice
      })

      // Sign transaction
      const signed = await dfnsClient.signTransaction(
        selectedWallet.id,
        transfer.transaction.id
      )

      // Broadcast transaction
      const broadcast = await dfnsClient.broadcastTransaction(
        selectedWallet.id,
        transfer.transaction.id
      )

      alert(`Transaction sent! Hash: ${broadcast.transaction.hash}`)
      setTransactionForm({ to: '', amount: '', asset: 'ETH' })
      await loadWalletDetails(selectedWallet)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading && wallets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading wallets...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Dfns Wallet Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Ethereum Sepolia Testnet</p>
        </div>

        {/* Wallet Selector */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Select Wallet</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleWalletSelect(wallet)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  selectedWallet?.id === wallet.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="font-semibold">{wallet.name}</div>
                <div className="text-sm text-gray-600">{wallet.network}</div>
                <div className="text-xs font-mono text-gray-500 mt-1 break-all">
                  {wallet.address}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedWallet && (
          <>
            {/* Wallet Info & Balances */}
            <div className="bg-white rounded-lg shadow mb-8 p-6">
              <h2 className="text-xl font-semibold mb-4">Wallet Details</h2>
              <div className="space-y-2">
                <p>
                  <strong>Name:</strong> {selectedWallet.name}
                </p>
                <p>
                  <strong>Network:</strong> {selectedWallet.network}
                </p>
                <p>
                  <strong>Address:</strong>{' '}
                  <code className="text-sm break-all">
                    {selectedWallet.address}
                  </code>
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    {selectedWallet.status}
                  </span>
                </p>
              </div>

              {balances && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Balances</h3>
                  <div className="space-y-2">
                    {balances.balances?.map((balance: any) => (
                      <div
                        key={balance.asset}
                        className="flex justify-between border-b pb-2"
                      >
                        <span>{balance.asset}</span>
                        <span className="font-mono">{balance.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Test Suite */}
            <div className="bg-white rounded-lg shadow mb-8 p-6">
              <h2 className="text-xl font-semibold mb-4">
                🧪 Complete Test Suite
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Runs 8 comprehensive tests including permissions, wallet access,
                balance checks, gas estimation, transaction creation, passkey
                signing, broadcasting, and confirmation.
              </p>
              <button
                onClick={runAllTests}
                disabled={isRunningTests}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
              </button>

              {testResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Test Results:</h3>
                  <div className="space-y-2">
                    {testResults.map((result, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded ${
                          result.success
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <strong>{result.name}</strong>
                            {result.success ? (
                              <span className="ml-2 text-green-600">
                                ✓ Passed
                              </span>
                            ) : (
                              <span className="ml-2 text-red-600">
                                ✗ Failed
                              </span>
                            )}
                          </div>
                          {result.data && (
                            <details className="text-xs">
                              <summary className="cursor-pointer">
                                Details
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          )}
                          {result.error && (
                            <div className="text-xs text-red-600 mt-1">
                              {result.error}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Send Transaction Form */}
            <div className="bg-white rounded-lg shadow mb-8 p-6">
              <h2 className="text-xl font-semibold mb-4">Send Transaction</h2>
              <form onSubmit={handleSendTransaction}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={transactionForm.to}
                      onChange={(e) =>
                        setTransactionForm({
                          ...transactionForm,
                          to: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0x..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (ETH)
                    </label>
                    <input
                      type="text"
                      value={transactionForm.amount}
                      onChange={(e) =>
                        setTransactionForm({
                          ...transactionForm,
                          amount: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0.001"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Send Transaction'}
                  </button>
                </div>
              </form>
            </div>

            {/* Recent Transactions */}
            {transactions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Recent Transactions
                </h2>
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="border-b pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm">
                            <strong>To:</strong> {tx.to.substring(0, 10)}...
                            {tx.to.substring(tx.to.length - 8)}
                          </p>
                          <p className="text-sm">
                            <strong>Amount:</strong> {tx.amount} {tx.asset}
                          </p>
                          <p className="text-xs text-gray-500">
                            <strong>Status:</strong>
                            <span
                              className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                tx.status === 'confirmed'
                                  ? 'bg-green-100 text-green-800'
                                  : tx.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </p>
                        </div>
                        {tx.hash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 text-sm hover:underline"
                          >
                            View on Etherscan →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-8">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  )
}
