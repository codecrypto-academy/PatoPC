import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const amountEURT = Number(body.amountEURT || 0)
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 })

  const stripe = new Stripe(stripeSecret)
  // Monto en cents (EUR), 6 decimales en token, aquí usamos euro cents
  const amountCents = Math.round(amountEURT * 100)

  const pi = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'eur',
    payment_method_types: ['card']
  })
  return NextResponse.json({ paymentIntentId: pi.id, clientSecret: pi.client_secret })
}
