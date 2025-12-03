import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export const metadata: Metadata = {
  title: 'Sistema de Gestión - Distribuidora',
  description: 'Sistema integral de gestión para distribuidora con módulos de preventistas, armado, reparto y administración',
  generator: 'Next.js',
  manifest: '/manifest.json',
  keywords: ['distribuidora', 'gestión', 'pedidos', 'entregas', 'preventista', 'repartidor'],
  authors: [{ name: 'Distribuidora' }],
  icons: [
    { rel: 'icon', url: '/icon-192x192.png' },
    { rel: 'apple-touch-icon', url: '/icon-192x192.png' },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Distribuidora',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Sistema de Gestión - Distribuidora',
    title: 'Sistema de Gestión - Distribuidora',
    description: 'Sistema integral de gestión para distribuidora',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Distribuidora" />
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
