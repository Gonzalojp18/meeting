/**
 * lib/schemas.js
 * Schemas Zod centralizados para validación de inputs en APIs.
 *
 * PRINCIPIO: Validar en el servidor ANTES de tocar la DB.
 * El cliente no es confiable — todo input debe ser validado.
 */

import { z } from 'zod';

// ─── Helpers reutilizables ────────────────────────────────────────────────────

const phoneArg = z
    .string()
    .trim()
    .min(8, 'Teléfono muy corto')
    .max(20, 'Teléfono muy largo')
    .regex(/^[\d\s\+\-\(\)]+$/, 'Teléfono con caracteres inválidos');

const emailOptional = z
    .string()
    .trim()
    .email('Email con formato inválido')
    .max(100)
    .optional()
    .or(z.literal(''));

const safeString = (max = 200) =>
    z.string().trim().min(1).max(max);

const nonNegativeNumber = z
    .number({ invalid_type_error: 'Debe ser un número' })
    .nonnegative('No puede ser negativo');

// ─── Schema: Order (POST /api/orders) ────────────────────────────────────────

/**
 * Validación del body de creación de una orden.
 * El cliente envía datos del cliente, items y ubicación.
 * Los precios se recalculan en el servidor — esto valida estructura, no montos.
 */
export const createOrderSchema = z.object({
    customerData: z.object({
        name: safeString(100),
        lastname: z.string().trim().max(100).optional().or(z.literal('')),
        phone: phoneArg,
        email: emailOptional,
    }),
    items: z
        .array(
            z.object({
                _id: z.string().min(1, 'ID de ítem requerido'),
                name: safeString(200),
                quantity: z.number().int().positive('Cantidad debe ser positiva').max(50, 'Cantidad máxima excedida'),
                price: nonNegativeNumber,
                // Personalizaciones opcionales
                customizations: z
                    .array(
                        z.object({
                            groupName: z.string().trim().max(100).optional(),
                            selections: z.array(z.string().trim().max(100)).optional(),
                            selected: z.string().trim().max(100).optional(),
                        })
                    )
                    .optional(),
            })
        )
        .min(1, 'El pedido debe tener al menos un ítem')
        .max(30, 'Demasiados ítems en el pedido'),
    location: z.object({
        locationId: z.string().trim().min(1, 'locationId requerido').max(100),
        locationName: z.string().trim().min(1).max(200),
    }),
    deliveryMethod: z.enum(['Retiro en Sucursal', 'A domicilio'], {
        errorMap: () => ({ message: 'Método de entrega inválido' }),
    }),
    deliveryAddress: z.string().trim().max(500).optional().or(z.literal('')),
    notes: z.string().trim().max(500).optional().or(z.literal('')),
    // El total se recalcula en el servidor; este se usa solo como referencia
    total: nonNegativeNumber,
    // Fuente de origen del pedido
    source: z.enum(['qr', 'link', 'direct']).optional(),
});

// ─── Schema: Login ────────────────────────────────────────────────────────────

export const loginSchema = z.object({
    email: z.string().trim().email('Email inválido').max(100).toLowerCase(),
    password: z.string().min(1, 'Contraseña requerida').max(200),
});

// ─── Schema: Crear usuario (POST /api/admin/users) ───────────────────────────

export const createUserSchema = z.object({
    name: safeString(100),
    email: z.string().trim().email('Email inválido').max(100).toLowerCase(),
    password: z
        .string()
        .min(8, 'Mínimo 8 caracteres')
        .max(200)
        .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
        .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
        .regex(/[0-9]/, 'Debe incluir al menos un número'),
    role: z.enum(['admin', 'manager', 'staff'], {
        errorMap: () => ({ message: 'Rol inválido' }),
    }),
    assignedLocations: z
        .array(z.string().trim().min(1).max(100))
        .max(20)
        .optional()
        .default([]),
});

// ─── Helper: parsear y responder 400 si falla ────────────────────────────────

/**
 * Parsea un body con un schema Zod.
 * Si falla devuelve un objeto { error, response } listo para retornar.
 * Si pasa devuelve { data }.
 *
 * Uso:
 *   const parsed = parseBody(body, createOrderSchema);
 *   if (parsed.error) return parsed.response;
 *   const { data } = parsed;
 */
export function parseBody(body, schema) {
    const result = schema.safeParse(body);
    if (!result.success) {
        const firstError = result.error.errors[0];
        const message = firstError
            ? `${firstError.path.join('.')}: ${firstError.message}`
            : 'Datos inválidos';
        return {
            error: true,
            response: Response.json(
                { error: message },
                { status: 400 }
            ),
        };
    }
    return { error: false, data: result.data };
}
