'use client';

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Analytics Avanzado</h2>
                <p className="text-gray-600 mt-1">Métricas detalladas y gráficos (Próximamente)</p>
            </div>

            <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-dashed border-purple-200">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">En Desarrollo</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Aquí se mostrarán gráficos avanzados, métricas de upselling,
                    productos más vendidos y análisis de tendencias.
                </p>
            </div>
        </div>
    );
}
