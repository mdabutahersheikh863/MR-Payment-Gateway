import { ProviderNotConfiguredError, type PaymentProviderAdapter } from "./types";

// bKash Tokenized Checkout adapter. Configure only against the merchant integration pack
// issued to your account; sandbox and production credentials/URLs are different.
export const bkash: PaymentProviderAdapter = {
  async start({ orderId, amountBdt, callbackUrl }) {
    const base = process.env.BKASH_BASE_URL;
    const appKey = process.env.BKASH_APP_KEY; const appSecret = process.env.BKASH_APP_SECRET;
    const username = process.env.BKASH_USERNAME; const password = process.env.BKASH_PASSWORD;
    if (process.env.BKASH_ENABLED !== "true" || !base || !appKey || !appSecret || !username || !password) {
      throw new ProviderNotConfiguredError("bKash is not enabled or merchant credentials are missing.");
    }
    const tokenRes = await fetch(`${base}/tokenized/checkout/token/grant`, {
      method: "POST", headers: { "Content-Type":"application/json", Accept:"application/json", username, password, "x-app-key":appKey },
      body: JSON.stringify({ app_key:appKey, app_secret:appSecret }), cache:"no-store", signal:AbortSignal.timeout(15000)
    });
    if (!tokenRes.ok) throw new Error("bKash token request failed");
    const tokenData = await tokenRes.json() as { id_token?:string };
    if (!tokenData.id_token) throw new Error("bKash did not return an access token");
    const createRes = await fetch(`${base}/tokenized/checkout/create`, {
      method:"POST", headers:{ "Content-Type":"application/json", Accept:"application/json", authorization:tokenData.id_token, "x-app-key":appKey },
      body:JSON.stringify({ mode:"0011", payerReference:orderId.slice(0,50), callbackURL:callbackUrl, amount:amountBdt.toFixed(2), currency:"BDT", intent:"sale", merchantInvoiceNumber:orderId.slice(0,50) }),
      cache:"no-store", signal:AbortSignal.timeout(15000)
    });
    if (!createRes.ok) throw new Error("bKash checkout creation failed");
    const data = await createRes.json() as { paymentID?:string; bkashURL?:string; statusCode?:string; statusMessage?:string };
    if (!data.paymentID || !data.bkashURL) throw new Error("bKash returned an invalid checkout response");
    return { providerPaymentId:data.paymentID, checkoutUrl:data.bkashURL, raw:{ paymentID:data.paymentID, statusCode:data.statusCode } };
  },
  async verify(providerPaymentId) {
    const base=process.env.BKASH_BASE_URL, appKey=process.env.BKASH_APP_KEY, username=process.env.BKASH_USERNAME, password=process.env.BKASH_PASSWORD;
    if (process.env.BKASH_ENABLED !== "true" || !base || !appKey || !process.env.BKASH_APP_SECRET || !username || !password) throw new ProviderNotConfiguredError("bKash verification is not configured.");
    const tokenRes=await fetch(`${base}/tokenized/checkout/token/grant`, { method:"POST", headers:{"Content-Type":"application/json",Accept:"application/json",username,password,"x-app-key":appKey}, body:JSON.stringify({app_key:appKey,app_secret:process.env.BKASH_APP_SECRET}),cache:"no-store",signal:AbortSignal.timeout(15000) });
    if(!tokenRes.ok) throw new Error("bKash verification token request failed");
    const token=await tokenRes.json() as {id_token?:string}; if(!token.id_token) throw new Error("bKash token missing");
    const res=await fetch(`${base}/tokenized/checkout/execute`, {method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",authorization:token.id_token,"x-app-key":appKey},body:JSON.stringify({paymentID:providerPaymentId}),cache:"no-store",signal:AbortSignal.timeout(15000)});
    // Execute may return a non-final result if already executed; query server-side next.
    let data: Record<string, unknown> = {};
    if(res.ok) data=await res.json() as Record<string, unknown>;
    const queryRes=await fetch(`${base}/tokenized/checkout/payment/status`, {method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",authorization:token.id_token,"x-app-key":appKey},body:JSON.stringify({paymentID:providerPaymentId}),cache:"no-store",signal:AbortSignal.timeout(15000)});
    if(!queryRes.ok) throw new Error("bKash status verification failed");
    const q=await queryRes.json() as Record<string, unknown>;
    const paid=q.transactionStatus === "Completed" && q.statusCode === "0000" && q.paymentID === providerPaymentId;
    const amount=Number(q.amount ?? data.amount ?? 0);
    return { paid, providerPaymentId, providerTrxId:typeof q.trxID === "string" ? q.trxID : undefined, amountBdt:Number.isFinite(amount)?amount:undefined, currency:typeof q.currency === "string"?q.currency:undefined, raw:{statusCode:q.statusCode,transactionStatus:q.transactionStatus} };
  }
};
