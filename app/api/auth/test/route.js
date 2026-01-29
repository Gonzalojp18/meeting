import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const { handlers } = await import('@/auth')
        return NextResponse.json({
            ok: true,
            hasHandlers: !!handlers,
            hasGET: typeof handlers?.GET === 'function',
            hasPOST: typeof handlers?.POST === 'function',
        })
    } catch (error) {
        return NextResponse.json({
            ok: false,
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 5),
        }, { status: 500 })
    }
}
