// ABOUTME: PaymentProvider interface and the simulated "Sandbox" gateway. No card data is ever collected, sent or stored.
// ABOUTME: A real gateway would implement the same interface; `authorize` receives the idempotency key to dedupe on its side.
import { createHash } from 'node:crypto';

export type PaymentMethod = 'sandbox_card' | 'ozone_escrow' | 'cod';

export interface AuthorizeRequest {
  amountCents: number;
  orderCode: string;
  idempotencyKey: string;
  /** Test control for the simulated card gateway only. */
  sandboxOutcome?: 'approve' | 'decline';
}

export interface AuthorizeResult {
  approved: boolean;
  reference: string;
  declineReason?: string;
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  /** Cash on delivery is collected later, so the order starts unpaid. */
  readonly collectsAtCheckout: boolean;
  /** Label used as the actor of the automatic PAID transition. */
  readonly actorLabel: string;
  authorize(req: AuthorizeRequest): Promise<AuthorizeResult>;
}

const ref = (prefix: string, req: AuthorizeRequest) =>
  `${prefix}_${createHash('sha256').update(`${req.idempotencyKey}:${req.amountCents}`).digest('hex').slice(0, 16)}`;

const sandboxCard: PaymentProvider = {
  method: 'sandbox_card',
  collectsAtCheckout: true,
  actorLabel: 'Sandbox gateway',
  async authorize(req) {
    if (req.sandboxOutcome === 'decline') {
      return { approved: false, reference: ref('sbx_declined', req), declineReason: 'The sandbox gateway declined this test payment' };
    }
    return { approved: true, reference: ref('sbx', req) };
  },
};

const ozoneEscrow: PaymentProvider = {
  method: 'ozone_escrow',
  collectsAtCheckout: true,
  actorLabel: 'Ozone Escrow (sandbox)',
  async authorize(req) {
    return { approved: true, reference: ref('esc', req) };
  },
};

const cod: PaymentProvider = {
  method: 'cod',
  collectsAtCheckout: false,
  actorLabel: 'Cash on delivery',
  async authorize(req) {
    return { approved: true, reference: ref('cod', req) };
  },
};

const providers: Record<PaymentMethod, PaymentProvider> = { sandbox_card: sandboxCard, ozone_escrow: ozoneEscrow, cod };

export const getPaymentProvider = (method: PaymentMethod): PaymentProvider => providers[method];
