import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { eq } from 'drizzle-orm';
import { addCredits } from '../services/credit-service.js';
import Stripe from 'stripe';

const stripe = new Stripe(config.stripe.secretKey);

const PRICE_LOOKUP: Record<string, { planTier: string; credits: number }> = {
  price_builder_monthly: { planTier: 'builder', credits: 500 },
  price_pro_monthly: { planTier: 'pro', credits: 2000 },
  price_team_monthly: { planTier: 'team', credits: 8000 },
};

export async function stripeRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/stripe/create-checkout', async (request, reply) => {
    const { userId } = request.user;
    const { priceId } = request.body as { priceId: string };

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: userId,
      success_url: `${request.headers.origin}/projects?checkout=success`,
      cancel_url: `${request.headers.origin}/pricing?checkout=cancelled`,
    });

    return { success: true, data: { url: session.url } };
  });

  fastify.post('/api/v1/stripe/create-portal', async (request, reply) => {
    const { userId } = request.user;

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer_email: user.email,
      return_url: `${request.headers.origin}/settings`,
    });

    return { success: true, data: { url: portal.url } };
  });

  fastify.post('/api/v1/stripe/webhook', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        JSON.stringify(request.body),
        sig,
        config.stripe.webhookSecret,
      );
    } catch {
      return reply.status(400).send({ success: false, error: 'Invalid signature' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;

      if (userId && priceId && PRICE_LOOKUP[priceId]) {
        const { planTier, credits } = PRICE_LOOKUP[priceId]!;

        await db
          .update(users)
          .set({ planTier, creditsRemaining: credits })
          .where(eq(users.id, userId));

        await addCredits(userId, credits, `Stripe subscription: ${planTier}`);
      }
    }

    return { success: true, data: null };
  });
}
