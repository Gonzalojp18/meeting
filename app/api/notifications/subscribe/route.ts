import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodbClient'

export async function POST(request: Request) {
    console.log('🔔 POST /api/notifications/subscribe - Inicio')
    try {
        const body = await request.json()
        console.log('📦 Body recibido:', body)
        const { subscription, userId } = body

        if (!subscription || !userId) {
            console.warn('⚠️ Suscripción o userId faltantes')
            return NextResponse.json(
                { error: 'Suscripción y userId son requeridos' },
                { status: 400 }
            )
        }

        const client = await clientPromise
        const db = client.db('menu')
        const subscriptionsCollection = db.collection('push_subscriptions')

        console.log('🔍 Buscando suscripción para userId:', userId)
        // Verificar si ya existe una suscripción para este usuario
        const existingSub = await subscriptionsCollection.findOne({ userId })

        if (existingSub) {
            console.log('🔄 Actualizando suscripción existente')
            // Actualizar la suscripción existente
            const result = await subscriptionsCollection.updateOne(
                { userId },
                {
                    $set: {
                        subscription,
                        updatedAt: new Date()
                    }
                }
            )
            console.log('✅ Resultado actualización:', result)
        } else {
            console.log('🆕 Creando nueva suscripción')
            // Crear nueva suscripción
            const result = await subscriptionsCollection.insertOne({
                userId,
                subscription,
                createdAt: new Date()
            })
            console.log('✅ Resultado inserción:', result)
        }

        return NextResponse.json(
            { message: 'Suscripción guardada exitosamente' },
            { status: 200 }
        )
    } catch (error) {
        console.error('❌ Error al guardar suscripción:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}