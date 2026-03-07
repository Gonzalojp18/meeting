import './global.css'
import '../index.css'
import '../Screen.css'
import { Analytics } from '@vercel/analytics/react'
import Providers from './Providers'

export const metadata = {
  title: 'Meeting Resto Bar',
  description: 'Meeting Resto Bar - Menu y pedidos',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Meeting',
  },
}

export const dynamic = 'force-dynamic'

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-visual',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
