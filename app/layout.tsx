import type { Metadata } from 'next';
import './globals.css';
import './brand.css';
import './simple.css';
import './call-hero.css';
import './ocean.css';
import {SiteShell} from '@/components/site-shell';
export const metadata: Metadata = { metadataBase:new URL(process.env.CALBOK_PUBLIC_ORIGIN || 'http://localhost:3000'), title: 'CALBOK — Lock the call. See the result.', description: 'Log a crypto call before it happens. Follow real results and learn from past calls.',twitter:{card:'summary_large_image'} };
export default function Layout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body><SiteShell>{children}</SiteShell></body></html>; }
