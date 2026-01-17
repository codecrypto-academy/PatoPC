"use client"
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'

export default function EuroTokenPurchase() {
  const [account, setAccount] = useState<string>('')
  const [amount, setAmount] = useState<number>(100)
  const [piId, setPiId] = useState<string>('')
  const [status, setStatus] = useState<string>('')

  const connect = async () => {
    const anyWindow = window as any
    if (!anyWindow.ethereum) { alert('MetaMask no encontrado'); return }
    const accounts = await anyWindow.ethereum.request({ method: 'eth_requestAccounts' })
    setAccount(accounts[0])
  }

  const createPayment = async () => {
    setStatus('Creando pago...')
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountEURT: amount, customer: account })
    })
    const data = await res.json()
    setPiId(data.paymentIntentId || '')
    setStatus('Pago creado. Usa tarjeta de prueba 4242...')
  }

  const mintAfterPayment = async () => {
    setStatus('Minting tokens...')
    const res = await fetch('/api/mint-tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountEURT: amount, customer: account, paymentIntentId: piId })
    })
    const data = await res.json()
    setStatus(data.message || 'Mint completado')
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Compra EuroTokens (EURT)</h1>
      <button onClick={connect} className="px-3 py-2 bg-indigo-600 text-white rounded">Conectar MetaMask</button>
      {account && <p>Cuenta: {account}</p>}
      <div className="space-y-2">
        <label>Cantidad (EURT)</label>
        <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} className="border p-2 w-full" />
      </div>
      <div className="flex gap-2">
        <button onClick={createPayment} className="px-3 py-2 bg-green-600 text-white rounded">Crear pago</button>
        <button onClick={mintAfterPayment} className="px-3 py-2 bg-blue-600 text-white rounded">Mint después del pago</button>
      </div>
      <p className="text-sm text-gray-700">Estado: {status}</p>
    </main>
  )
}
