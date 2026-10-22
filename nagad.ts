import { ProviderNotConfiguredError, type PaymentProviderAdapter } from "./types";

// Fail-closed by design. Nagad merchant integrations use account-specific signing/encryption
// details and callback verification. Add the exact official SDK/spec from your approved pack;
// do not guess crypto formats or trust a browser redirect as proof of payment.
export const nagad: PaymentProviderAdapter = {
  async start() {
    if (process.env.NAGAD_ENABLED !== "true" || !process.env.NAGAD_BASE_URL || !process.env.NAGAD_MERCHANT_ID || !process.env.NAGAD_PUBLIC_KEY || !process.env.NAGAD_PRIVATE_KEY) {
      throw new ProviderNotConfiguredError("Nagad is not enabled or merchant credentials are missing.");
    }
    throw new ProviderNotConfiguredError("Nagad credentials are present, but the merchant-specific official signing/checkout adapter must be completed from your Nagad integration pack before live payments are enabled.");
  },
  async verify() { throw new ProviderNotConfiguredError("Nagad server-side verification is not enabled until the official merchant-specific signature verification adapter is configured."); }
};
