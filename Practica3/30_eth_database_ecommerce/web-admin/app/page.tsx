"use client"
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'

const ECOMMERCE_ADDRESS = process.env.NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS as string
const ecommerceAbi = [
  'function registerCompany(string name, string taxId) returns (uint256)',
  'function getAllProducts() view returns (tuple(uint256 productId,uint256 companyId,string name,string description,uint256 price,uint256 stock,string ipfsImageHash,bool isActive)[])'
]

export default function AdminDashboard() {
  const [account, setAccount] = useState('')
  const [companyName, setCompanyName] = useState('Mi Tienda')
  const [taxId, setTaxId] = useState('TAX123')
  const [status, setStatus] = useState('')

  const connect = async () => {
    const anyWindow = window as any
    await anyWindow.ethereum.request({ method: 'eth_requestAccounts' })
    setAccount(anyWindow.ethereum.selectedAddress)
  }

  const registerCompany = async () => {
    const anyWindow = window as any
    const provider = new ethers.BrowserProvider(anyWindow.ethereum)
    const signer = await provider.getSigner()
    const ec = new ethers.Contract(ECOMMERCE_ADDRESS, ecommerceAbi, signer)
    setStatus('Registrando empresa...')
    const tx = await ec.registerCompany(companyName, taxId)
    await tx.wait()
    setStatus('Empresa registrada')
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Panel Admin</h1>
      <button onClick={connect} className="px-3 py-2 bg-indigo-600 text-white rounded">Conectar MetaMask</button>
      {account && <p>Cuenta: {account}</p>}
      <div className="space-y-2">
        <input className="border p-2 w-full" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Nombre de empresa" />
        <input className="border p-2 w-full" value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="Tax ID" />
      </div>
      <button onClick={registerCompany} className="px-3 py-2 bg-green-600 text-white rounded">Registrar Empresa</button>
      <p className="text-sm">Estado: {status}</p>
    </main>
  )
}
