import '../index.css'
import '../Screen.css'
import { Analytics } from '@vercel/analytics/react'
import Providers from './Providers'

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <title>Meeting Resto Bar - Admin</title>
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