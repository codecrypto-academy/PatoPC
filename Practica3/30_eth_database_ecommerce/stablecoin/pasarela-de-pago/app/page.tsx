"use client"
import { useMemo, useState } from 'react'
import { ethers } from 'ethers'

const EUROTOKEN_ADDRESS = process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS as string
const ECOMMERCE_ADDRESS = process.env.NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS as string

const erc20Abi = [
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 value) returns (bool)'
]
const ecommerceAbi = [
  'function processPayment(address customer, uint256 amount, uint256 invoiceId)'
]

export default function PasarelaPage() {
  const params = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), [])
  const merchant = params.get('merchant_address') || ''
  const amount = Number(params.get('amount') || '0')
  const invoice = params.get('invoice') || ''
  const date = params.get('date') || ''
  const redirect = params.get('redirect') || ''

  const [status, setStatus] = useState('')

  const pay = async () => {
    const anyWindow = window as any
    if (!anyWindow.ethereum) { alert('MetaMask no encontrado'); return }
    await anyWindow.ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.BrowserProvider(anyWindow.ethereum)
    const signer = await provider.getSigner()
    const token = new ethers.Contract(EUROTOKEN_ADDRESS, erc20Abi, signer)
    const ecommerce = new ethers.Contract(ECOMMERCE_ADDRESS, ecommerceAbi, signer)

    const decimals: number = await token.decimals()
    const wei = ethers.parseUnits(String(amount), decimals)

    setStatus('Aprobando gasto...')
    const approveTx = await token.approve(ECOMMERCE_ADDRESS, wei)
    await approveTx.wait()

    setStatus('Procesando pago...')
    const customer = await signer.getAddress()
    const invId = Number(String(invoice).replace(/[^0-9]/g, '') || '0')
    const tx = await ecommerce.processPayment(customer, wei, invId)
    const receipt = await tx.wait()

    setStatus('Pago exitoso: ' + (receipt?.hash || ''))
    if (redirect) {
      const url = new URL(redirect)
      url.searchParams.set('status', 'paid')
      url.searchParams.set('invoice', String(invId))
      url.searchParams.set('tx', receipt?.hash || '')
      window.location.href = url.toString()
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-bold">Pasarela de Pago EURT</h1>
      <div className="p-4 bg-white rounded shadow">
        <p><strong>Comerciante:</strong> {merchant}</p>
        <p><strong>Monto:</strong> €{amount.toFixed(2)}</p>
        <p><strong>Invoice:</strong> {invoice}</p>
        <p><strong>Fecha:</strong> {date}</p>
      </div>
      <button onClick={pay} className="px-3 py-2 bg-indigo-600 text-white rounded">Pagar con EURT</button>
      <p className="text-sm">Estado: {status}</p>
    </main>
  )
}
