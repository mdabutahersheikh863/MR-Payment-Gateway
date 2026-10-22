import { bkash } from "./bkash";
import { nagad } from "./nagad";
import type { PaymentProvider } from "@prisma/client";
import type { PaymentProviderAdapter } from "./types";
export function getProvider(provider: PaymentProvider): PaymentProviderAdapter { return provider === "BKASH" ? bkash : nagad; }
