# Marketing QR - Technical Implementation Guide

Este documento contiene las instrucciones técnicas completas para implementar el sistema de Marketing QR en un nuevo proyecto.

## 📋 Overview

El sistema de Marketing QR permite a los restaurantes configurar promociones personalizadas que se muestran cuando los clientes escanean códigos QR. Incluye:

- **3 tipos de campañas**: Descuento, Informativo, Captación de Club
- **Control de frecuencia**: Una vez, Diario, Siempre
- **Estilos globales**: Configuración de diseño por superadmin
- **Tracking de vistas**: Por IP para controlar frecuencia
- **Integración con checkout**: Descuentos aplicados automáticamente

---

## 🗄️ Database Schema

### 1. Tenant Model (Agregar campo qrPromo)

```typescript
// models/Tenant.ts
qrPromo: {
  isEnabled: boolean
  type: 'discount' | 'info' | 'loyalty'
  discountPercentage: number // 0-100
  frequency: 'once' | 'every_visit' | 'daily'
  title: string
  subtitle: string
  buttonText: string
  termsText: string
}
```

**Mongoose Schema:**
```typescript
qrPromo: {
  isEnabled: { type: Boolean, default: false },
  type: { type: String, enum: ['discount', 'info', 'loyalty'], default: 'discount' },
  discountPercentage: { type: Number, default: 15, min: 0, max: 100 },
  frequency: { type: String, enum: ['once', 'every_visit', 'daily'], default: 'once' },
  title: { type: String, default: '¡Primera vez por QR!' },
  subtitle: { type: String, default: 'Obtené {discount}% OFF en tu primer pedido takeaway' },
  buttonText: { type: String, default: 'Ver menú' },
  termsText: { type: String, default: 'Válido solo para pedidos takeaway. No acumulable con otras promociones.' },
}
```

### 2. QrPromoView Model (Nuevo)

```typescript
// models/QrPromoView.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IQrPromoView extends Document {
  tenantId: mongoose.Types.ObjectId
  ip: string
  userAgent?: string
  source: string
  viewedAt: Date
  discountPercentage: number
}

const QrPromoViewSchema = new Schema<IQrPromoView>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      default: '',
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
    discountPercentage: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: false, // Usamos viewedAt directamente
  }
)

// Índice compuesto para buscar rápido por tenant + ip
QrPromoViewSchema.index({ tenantId: 1, ip: 1, viewedAt: -1 })

const QrPromoView = mongoose.models.QrPromoView || mongoose.model<IQrPromoView>('QrPromoView', QrPromoViewSchema)
export default QrPromoView
```

### 3. PlatformConfig Model (Agregar campo qrPromoStyles)

```typescript
// models/PlatformConfig.ts
qrPromoStyles: {
  primaryColor: string
  backgroundColor: string
  badgeColor: string
  borderRadius: string
  buttonColor: string
}
```

---

## 🔌 API Endpoints

### 1. GET /api/[tenant]/qr-promo

Verifica si debe mostrar la promo según frecuencia y source.

```typescript
// app/api/[tenant]/qr-promo/route.ts
import { connectDB } from '@/lib/mongoose'
import Tenant from '@/models/Tenant'
import QrPromoView from '@/models/QrPromoView'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || ''
    
    // Solo mostrar promo si viene de QR (source contiene 'qr')
    if (!source.toLowerCase().includes('qr')) {
      return NextResponse.json({ show: false, reason: 'not_qr_source' })
    }

    await connectDB()

    const tenant = await Tenant.findOne({ slug: tenantSlug }).select('qrPromo _id name')
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const qrPromo = tenant.qrPromo

    // Si la promo no está habilitada
    if (!qrPromo?.isEnabled) {
      return NextResponse.json({ show: false, reason: 'not_enabled' })
    }

    // Obtener IP del visitante
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    const userAgent = request.headers.get('user-agent') || ''

    // Si la frecuencia es 'every_visit', no bloqueamos nunca
    if (qrPromo.frequency !== 'every_visit') {
      // Verificar si ya vio la promo según la frecuencia configurada
      if (qrPromo.frequency === 'once') {
        const existingView = await QrPromoView.findOne({
          tenantId: tenant._id,
          ip,
        })

        if (existingView) {
          return NextResponse.json({ show: false, reason: 'already_viewed' })
        }
      } else if (qrPromo.frequency === 'daily') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const existingView = await QrPromoView.findOne({
          tenantId: tenant._id,
          ip,
          viewedAt: { $gte: today }
        })

        if (existingView) {
          return NextResponse.json({ show: false, reason: 'already_viewed_today' })
        }
      }
    }

    // Personalizar el texto con el descuento
    const subtitle = qrPromo.subtitle.replace('{discount}', String(qrPromo.discountPercentage))

    return NextResponse.json({
      show: true,
      promo: {
        ...qrPromo,
        subtitle,
        discountPercentage: qrPromo.discountPercentage,
      },
      tenantName: tenant.name,
    })
  } catch (error) {
    console.error('QR Promo GET error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
```

### 2. POST /api/[tenant]/qr-promo

Registra que el usuario vio la promo (para tracking de frecuencia).

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params
    const body = await request.json()
    const { source } = body

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    const userAgent = request.headers.get('user-agent') || ''

    await connectDB()

    const tenant = await Tenant.findOne({ slug: tenantSlug }).select('_id qrPromo')
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Solo registrar si no es 'every_visit' para no saturar la DB
    if (tenant.qrPromo?.frequency !== 'every_visit') {
      await QrPromoView.create({
        tenantId: tenant._id,
        ip,
        userAgent,
        source,
        viewedAt: new Date(),
        discountPercentage: tenant.qrPromo?.discountPercentage || 0,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('QR Promo POST error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
```

### 3. PUT /api/[tenant]/admin/qr-promo

Guarda la configuración de la promo del tenant.

```typescript
// app/api/[tenant]/admin/qr-promo/route.ts
import { connectDB } from '@/lib/mongoose'
import Tenant from '@/models/Tenant'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/apiAuth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params
    
    // Autenticación (ajustar según tu sistema)
    const authError = await requireAuth(request, tenantSlug)
    if (authError) return authError

    const body = await request.json()
    
    await connectDB()

    const tenant = await Tenant.findOneAndUpdate(
      { slug: tenantSlug },
      { $set: { qrPromo: body } },
      { new: true }
    )

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, qrPromo: tenant.qrPromo })
  } catch (error) {
    console.error('QR Promo PUT error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params
    
    const authError = await requireAuth(request, tenantSlug)
    if (authError) return authError

    await connectDB()

    const tenant = await Tenant.findOne({ slug: tenantSlug }).select('qrPromo')
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({ qrPromo: tenant.qrPromo })
  } catch (error) {
    console.error('QR Promo GET error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
```

### 4. GET/PUT /api/superadmin/qr-promo-defaults

Configuración de estilos globales.

```typescript
// app/api/superadmin/qr-promo-defaults/route.ts
import { connectDB } from '@/lib/mongoose'
import PlatformConfig from '@/models/PlatformConfig'
import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/apiAuth'

export async function GET(request: NextRequest) {
  try {
    const authError = await requireSuperadmin(request)
    if (authError) return authError

    await connectDB()

    const config = await PlatformConfig.findOne()
    
    return NextResponse.json({ qrPromoStyles: config?.qrPromoStyles })
  } catch (error) {
    console.error('QR Promo Defaults GET error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authError = await requireSuperadmin(request)
    if (authError) return authError

    const body = await request.json()
    
    await connectDB()

    const config = await PlatformConfig.findOneAndUpdate(
      {},
      { $set: { qrPromoStyles: body } },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true, qrPromoStyles: config.qrPromoStyles })
  } catch (error) {
    console.error('QR Promo Defaults PUT error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
```

---

## 🎨 Components

### 1. QrPromoConfig (Admin Component)

Componente para que el admin configure la promo.

```typescript
// components/admin/QrPromoConfig.tsx
'use client'

import { useState, useEffect } from 'react'
import { Save, Percent, ToggleLeft, ToggleRight, Info, QrCode, Gift, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QrPromoConfigProps {
  tenantSlug: string
}

interface QrPromoData {
  isEnabled: boolean
  type: 'discount' | 'info' | 'loyalty'
  discountPercentage: number
  frequency: 'once' | 'every_visit' | 'daily'
  title: string
  subtitle: string
  buttonText: string
  termsText: string
}

export default function QrPromoConfig({ tenantSlug }: QrPromoConfigProps) {
  const [config, setConfig] = useState<QrPromoData>({
    isEnabled: false,
    type: 'discount',
    discountPercentage: 15,
    frequency: 'once',
    title: '¡Primera vez por QR!',
    subtitle: 'Obtené {discount}% OFF en tu primer pedido takeaway',
    buttonText: 'Ver menú',
    termsText: 'Válido solo para pedidos takeaway. No acumulable con otras promociones.',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchConfig()
  }, [tenantSlug])

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/${tenantSlug}/admin/qr-promo`)
      const data = await res.json()
      if (data.qrPromo) {
        setConfig(data.qrPromo)
      }
    } catch (e) {
      console.error('Error fetching config:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')

    try {
      const res = await fetch(`/api/${tenantSlug}/admin/qr-promo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (key: keyof QrPromoData, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return <div>Cargando configuración...</div>
  }

  return (
    <div className="space-y-6">
      {/* Toggle Enable/Disable */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Marketing QR</h2>
        <button
          onClick={() => updateConfig('isEnabled', !config.isEnabled)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
            config.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          )}
        >
          {config.isEnabled ? 'Activado' : 'Desactivado'}
        </button>
      </div>

      {config.isEnabled && (
        <div className="space-y-6">
          {/* Tipo de Campaña */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Campaña</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'discount', label: 'Promocional' },
                { value: 'info', label: 'Informativo' },
                { value: 'loyalty', label: 'Captación Club' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateConfig('type', option.value as any)}
                  className={cn(
                    'p-3 rounded-lg border-2',
                    config.type === option.value ? 'border-primary bg-primary/5' : 'border-gray-200'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descuento (solo si es discount) */}
          {config.type === 'discount' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Descuento</label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={config.discountPercentage}
                onChange={(e) => updateConfig('discountPercentage', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center font-bold mt-2">{config.discountPercentage}%</div>
            </div>
          )}

          {/* Frecuencia */}
          <div>
            <label className="text-sm font-medium mb-2 block">Frecuencia</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'once', label: 'Una vez' },
                { value: 'daily', label: 'Diario' },
                { value: 'every_visit', label: 'Siempre' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateConfig('frequency', option.value as any)}
                  className={cn(
                    'p-3 rounded-lg border-2',
                    config.frequency === option.value ? 'border-primary bg-primary/5' : 'border-gray-200'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Textos */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Título</label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subtítulo (usa {discount} para el %)</label>
              <input
                type="text"
                value={config.subtitle}
                onChange={(e) => updateConfig('subtitle', e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Texto del botón</label>
              <input
                type="text"
                value={config.buttonText}
                onChange={(e) => updateConfig('buttonText', e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Términos</label>
              <textarea
                value={config.termsText}
                onChange={(e) => updateConfig('termsText', e.target.value)}
                className="w-full p-2 border rounded-lg"
                rows={2}
              />
            </div>
          </div>
        </div>
      )}

      {error && <div className="text-red-600">{error}</div>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
      </Button>
    </div>
  )
}
```

### 2. QrPromoBanner (Client Component)

Banner que se muestra al cliente cuando escanea el QR.

```typescript
// components/menu/QrPromoBanner.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Percent, ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface QrPromoData {
  isEnabled: boolean
  type: 'discount' | 'info' | 'loyalty'
  discountPercentage: number
  frequency: string
  title: string
  subtitle: string
  buttonText: string
  termsText: string
}

interface QrPromoBannerProps {
  tenantSlug: string
  source: string
}

export default function QrPromoBanner({ tenantSlug, source }: QrPromoBannerProps) {
  const [show, setShow] = useState(false)
  const [promo, setPromo] = useState<QrPromoData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPromo()
  }, [tenantSlug, source])

  const checkPromo = async () => {
    if (!source || !source.toLowerCase().includes('qr')) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/${tenantSlug}/qr-promo?source=${source}`)
      const data = await res.json()
      
      if (data.show && data.promo) {
        setPromo(data.promo)
        setShow(true)
        if (data.promo.type === 'discount') {
          sessionStorage.setItem('active-qr-promo', JSON.stringify({
            discountPercentage: data.promo.discountPercentage,
            tenantSlug
          }))
        }
      }
    } catch (e) {
      console.error('Error checking promo:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setShow(false)
    fetch(`/api/${tenantSlug}/qr-promo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    })
  }

  if (loading || !show || !promo) return null

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <X size={20} />
            </button>

            {promo.type === 'discount' && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-full font-bold">
                  <Percent size={16} />
                  {promo.discountPercentage}% OFF
                </div>
              </div>
            )}

            <h2 className="text-2xl font-bold text-center mb-2">{promo.title}</h2>
            <p className="text-gray-600 text-center mb-6">
              {promo.type === 'discount' 
                ? promo.subtitle.replace('{discount}', `${promo.discountPercentage}%`)
                : promo.subtitle}
            </p>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {promo.buttonText}
              <ArrowRight size={20} />
            </button>

            <p className="text-xs text-gray-400 text-center mt-4">{promo.termsText}</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
```

### 3. SuperadminQrPromoStyles (Superadmin Component)

Configuración de estilos globales.

```typescript
// components/superadmin/SuperadminQrPromoStyles.tsx
'use client'

import { useState, useEffect } from 'react'
import { Save, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SuperadminQrPromoStyles() {
  const [styles, setStyles] = useState({
    primaryColor: '#F74211',
    backgroundColor: '#FFF5F0',
    badgeColor: '#F74211',
    borderRadius: '24px',
    buttonColor: '#F74211',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchStyles()
  }, [])

  const fetchStyles = async () => {
    try {
      const res = await fetch('/api/superadmin/qr-promo-defaults')
      const data = await res.json()
      if (data.qrPromoStyles) {
        setStyles(data.qrPromoStyles)
      }
    } catch (e) {
      console.error('Error fetching styles:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/qr-promo-defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(styles),
      })
      if (!res.ok) throw new Error('Error al guardar')
    } catch (e) {
      console.error('Error saving:', e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Palette size={20} />
        Estilos Globales: Marketing QR
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-2">Color Primario</label>
          <input 
            type="color" 
            value={styles.primaryColor}
            onChange={e => setStyles(s => ({ ...s, primaryColor: e.target.value }))}
            className="w-full h-10 rounded"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Color Botón</label>
          <input 
            type="color" 
            value={styles.buttonColor}
            onChange={e => setStyles(s => ({ ...s, buttonColor: e.target.value }))}
            className="w-full h-10 rounded"
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar Configuración Global'}
      </Button>
    </div>
  )
}
```

---

## 📄 Pages

### 1. Admin Marketing QR Page

```typescript
// app/[tenant]/admin/marketing-qr/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { connectDB } from '@/lib/mongoose'
import Tenant from '@/models/Tenant'
import { Gift } from 'lucide-react'
import QrPromoConfig from '@/components/admin/QrPromoConfig'

export default async function MarketingQrPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const session = await auth()

  if (!session?.user) redirect('/login')

  await connectDB()

  const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true })
    .select('_id name slug')
    .lean()

  if (!tenant) redirect('/login')

  const isOwner = session.user.tenantSlug === tenantSlug
  const isSuperadmin = session.user.role === 'superadmin'

  if (!isOwner && !isSuperadmin) redirect('/login')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift size={24} />
          Marketing QR
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurá banners informativos y promociones especiales para quienes escanean el QR
        </p>
      </div>

      <QrPromoConfig tenantSlug={tenantSlug} />
    </div>
  )
}
```

### 2. Superadmin Marketing QR Page

```typescript
// app/superadmin/marketing-qr/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Gift } from 'lucide-react'
import SuperadminQrPromoStyles from '@/components/superadmin/SuperadminQrPromoStyles'

export default async function SuperAdminMarketingQrPage() {
  const session = await auth()
  if (!session || session.user.role !== 'superadmin') redirect('/login')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift size={24} />
          Marketing QR Global
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurá la estética base de las promociones y banners que usan los restaurantes
        </p>
      </div>

      <SuperadminQrPromoStyles />
    </div>
  )
}
```

---

## 🔗 Integration Points

### 1. Menu Page Integration

Agregar el banner en la página del menú:

```typescript
// app/[tenant]/menu/[locationId]/page.tsx
import QrPromoBanner from '@/components/menu/QrPromoBanner'

export default function MenuPage({ params }: { params: Promise<{ tenant: string; locationId: string }> }) {
  const { tenant, locationId } = await params
  
  return (
    <div>
      {/* ... resto del menú ... */}
      
      <QrPromoBanner 
        tenantSlug={tenant} 
        source="qr-menu" 
      />
    </div>
  )
}
```

### 2. Checkout Integration

Aplicar el descuento en el checkout:

```typescript
// components/menu/CheckoutForm.tsx
const [activeQrPromo, setActiveQrPromo] = useState<{ discountPercentage: number } | null>(null)

useEffect(() => {
  const stored = sessionStorage.getItem('active-qr-promo')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed.tenantSlug === tenantSlug && parsed.discountPercentage > 0) {
        setActiveQrPromo(parsed)
      }
    } catch (e) {
      console.error('Error parsing QR promo:', e)
    }
  }
}, [tenantSlug])

// Calcular total con descuento
const totalWithDiscount = activeQrPromo 
  ? total * (1 - activeQrPromo.discountPercentage / 100)
  : total
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.400.0"
  }
}
```

---

## ✅ Implementation Checklist

- [ ] Agregar campo `qrPromo` al modelo Tenant
- [ ] Crear modelo QrPromoView
- [ ] Agregar campo `qrPromoStyles` al modelo PlatformConfig
- [ ] Crear API `/api/[tenant]/qr-promo` (GET/POST)
- [ ] Crear API `/api/[tenant]/admin/qr-promo` (GET/PUT)
- [ ] Crear API `/api/superadmin/qr-promo-defaults` (GET/PUT)
- [ ] Crear componente QrPromoConfig
- [ ] Crear componente QrPromoBanner
- [ ] Crear componente SuperadminQrPromoStyles
- [ ] Crear página `/[tenant]/admin/marketing-qr`
- [ ] Crear página `/superadmin/marketing-qr`
- [ ] Integrar QrPromoBanner en página de menú
- [ ] Integrar descuento en checkout
- [ ] Probar flujo completo

---

## 🎯 Testing Flow

1. **Configurar promo** como admin
2. **Escanear QR** con source=qr
3. **Verificar** que se muestra el banner
4. **Cerrar banner** y verificar que se registra en QrPromoView
5. **Escanear nuevamente** y verificar control de frecuencia
6. **Hacer pedido** y verificar que se aplica el descuento
7. **Configurar estilos globales** como superadmin
8. **Verificar** que los estilos se aplican

---

## 📝 Notes

- El sistema usa IP para tracking de frecuencia. En producción, considerar usar fingerprinting más robusto.
- Los estilos globales permiten consistencia de marca across toda la plataforma.
- El banner usa framer-motion para animaciones suaves.
- El descuento se guarda en sessionStorage para persistir durante la sesión.
