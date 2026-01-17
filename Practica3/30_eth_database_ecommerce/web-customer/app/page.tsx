"use client"
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'

const ECOMMERCE_ADDRESS = process.env.NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS as string
const ecommerceAbi = [
  'function getAllProducts() view returns (tuple(uint256 productId,uint256 companyId,string name,string description,uint256 price,uint256 stock,string ipfsImageHash,bool isActive)[])',
  'function addToCart(uint256 productId, uint256 quantity)'
]

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('http://localhost:8545')
        const ec = new ethers.Contract(ECOMMERCE_ADDRESS, ecommerceAbi, provider)
        const list = await ec.getAllProducts()
        setProducts(list)
      } catch (e) {
        setStatus('Error cargando productos')
      }
    }
    load()
  }, [])

  const addToCart = async (productId: number) => {
    const anyWindow = window as any
    await anyWindow.ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.BrowserProvider(anyWindow.ethereum)
    const signer = await provider.getSigner()
    const ec = new ethers.Contract(ECOMMERCE_ADDRESS, ecommerceAbi, signer)
    setStatus('Agregando al carrito...')
    const tx = await ec.addToCart(productId, 1)
    await tx.wait()
    setStatus('Agregado!')
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Productos</h1>
      <div className="grid grid-cols-1 gap-4">
        {products.map((p, idx) => (
          <div key={idx} className="p-4 bg-white rounded shadow">
            <h2 className="font-semibold">{p.name}</h2>
            <p>€{Number(p.price)/1e6}</p>
            <p>Stock: {Number(p.stock)}</p>
            <button onClick={() => addToCart(Number(p.productId))} className="mt-2 px-3 py-2 bg-indigo-600 text-white rounded">Add to Cart</button>
          </div>
        ))}
      </div>
      <p className="text-sm mt-4">{status}</p>
    </main>
  )
}
