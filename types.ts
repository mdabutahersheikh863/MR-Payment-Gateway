export type StartPaymentInput = { orderId: string; amountBdt: number; callbackUrl: string };
export type StartedPayment = { providerPaymentId: string; checkoutUrl: string; raw?: unknown };
export type VerifiedPayment = { paid: boolean; providerPaymentId: string; providerTrxId?: string; amountBdt?: number; currency?: string; raw?: unknown };
export interface PaymentProviderAdapter {
  start(input: StartPaymentInput): Promise<StartedPayment>;
  verify(providerPaymentId: string): Promise<VerifiedPayment>;
}
export class ProviderNotConfiguredError extends Error { constructor(message: string) { super(message); this.name = "ProviderNotConfiguredError"; } }
