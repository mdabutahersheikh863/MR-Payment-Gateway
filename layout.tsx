import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"MR Payment Gateway", description:"Secure checkout demo for approved bKash and Nagad merchant APIs", robots:{index:false,follow:false} };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
