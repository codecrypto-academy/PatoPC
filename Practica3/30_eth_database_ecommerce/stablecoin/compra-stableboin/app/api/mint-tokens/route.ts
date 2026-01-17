import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { ethers } from 'ethers'

const EUROTOKEN_ADDRESS = process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS
const WALLET_PK = process.env.WALLET_PRIVATE_KEY

const erc20Abi = [
  'function mint(address to, uint256 amount) external',
  'function decimals() view returns (uint8)'
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amountEURT, customer, paymentIntentId } = body
    if (!EUROTOKEN_ADDRESS || !WALLET_PK) return NextResponse.json({ error: 'Missing env: contract address or wallet PK' }, { status: 500 })

    // Validar pago
    const stripeSecret = process.env.STRIPE_SECRET_KEY
    if (!stripeSecret) return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 })
    const stripe = new Stripe(stripeSecret)
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (pi.status !== 'succeeded') return NextResponse.json({ error: 'Payment not confirmed' }, { status: 400 })

    // Mint tokens a la wallet del usuario
    const provider = new ethers.JsonRpcProvider('http://localhost:8545')
    const wallet = new ethers.Wallet(WALLET_PK, provider)
    const token = new ethers.Contract(EUROTOKEN_ADDRESS, erc20Abi, wallet)
    const decimals: number = await token.decimals()
    const amount = ethers.parseUnits(String(amountEURT), decimals)
    const tx = await token.mint(customer, amount)
    const receipt = await tx.wait()

    return NextResponse.json({ message: 'Mint OK', txHash: receipt?.hash })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Mint error' }, { status: 500 })
  }
}
