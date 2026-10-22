import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { newOrderId } from "@/lib/security";
import { ProviderNotConfiguredError } from "@/lib/providers/types";
export const runtime="nodejs";
const schema=z.object({provider:z.enum(["BKASH","NAGAD"]),amount:z.number().int().min(10).max(50000)});
export async function POST(req:Request){
  const idempotencyKey=req.headers.get("Idempotency-Key")??"";
  if(!/^[a-f0-9-]{36}$/i.test(idempotencyKey)) return NextResponse.json({error:"A valid idempotency key is required."},{status:400});
  let body:unknown;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON."},{status:400})}
  const parsed=schema.safeParse(body);if(!parsed.success)return NextResponse.json({error:"Choose bKash or Nagad and enter an integer amount from BDT 10 to 50,000."},{status:400});
  const prior=await db.transaction.findUnique({where:{idempotencyKey}});if(prior)return NextResponse.json({orderId:prior.orderId,status:prior.status,checkoutUrl:prior.checkoutUrl});
  const orderId=newOrderId();let tx;
  try{tx=await db.transaction.create({data:{orderId,idempotencyKey,provider:parsed.data.provider as PaymentProvider,amountPaisa:parsed.data.amount*100,status:PaymentStatus.PENDING}})}catch{return NextResponse.json({error:"Could not create a unique transaction. Please retry."},{status:409})}
  try{
    const adapter=getProvider(tx.provider);const started=await adapter.start({orderId,amountBdt:parsed.data.amount,callbackUrl:`${process.env.APP_BASE_URL}/api/payments/callback/${tx.provider.toLowerCase()}`});
    await db.transaction.update({where:{id:tx.id},data:{status:PaymentStatus.INITIATED,providerPaymentId:started.providerPaymentId,checkoutUrl:started.checkoutUrl,providerResponse:started.raw as never}});
    return NextResponse.json({orderId,status:"INITIATED",checkoutUrl:started.checkoutUrl});
  }catch(error){const safeMessage=error instanceof ProviderNotConfiguredError?error.message:"Provider could not initiate the payment. Check server logs and merchant settings.";await db.transaction.update({where:{id:tx.id},data:{status:PaymentStatus.FAILED,failureCode:error instanceof ProviderNotConfiguredError?"PROVIDER_NOT_CONFIGURED":"PROVIDER_START_FAILED"}});return NextResponse.json({error:safeMessage,orderId,status:"FAILED"},{status:error instanceof ProviderNotConfiguredError?503:502});}
}
