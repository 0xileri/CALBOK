import type { Metadata } from 'next';
import './globals.css';
import './brand.css';
export const metadata: Metadata = { metadataBase:new URL(process.env.CALBOK_PUBLIC_ORIGIN || 'http://localhost:3000'), title: 'CALBOK — Calls fade. Receipts stay.', description: 'Lock the call. Verify the outcome. Remember the lesson. CALBOK is the verifiable record behind market predictions.',twitter:{card:'summary_large_image'} };
export default function Layout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
