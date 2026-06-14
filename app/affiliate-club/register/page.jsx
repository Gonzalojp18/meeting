'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MdBusiness, MdPhone, MdEmail, MdPerson, MdWork, MdCheckCircle, MdContentCopy, MdShield } from 'react-icons/md';

function RegisterForm() {
    const [mounted, setMounted] = useState(false);
    const searchParams = useSearchParams();
    const locationId = searchParams.get('locationId') || '';
    const discount = searchParams.get('discount') || '10';

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        position: ''
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="animate-pulse text-gray-400">Cargando...</div>
            </div>
        </div>;
    }

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/affiliate-club/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    locationId,
                    discount: parseInt(discount)
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error en el registro');
            }

            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = () => {
        if (result?.discountCode) {
            navigator.clipboard.writeText(result.discountCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (result) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MdCheckCircle className="w-8 h-8 text-green-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            ¡Registro Exitoso!
                        </h1>
                        <p className="text-gray-600 mb-6">
                            Te has registrado correctamente en nuestro Club de Afiliados
                        </p>

                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 mb-6">
                            <p className="text-sm text-gray-600 mb-2">Tu código de descuento es:</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-3xl font-bold text-purple-900">{result.discountCode}</span>
                                <button
                                    onClick={copyCode}
                                    className={`p-2 rounded-lg transition-all duration-300 flex items-center gap-1 ${
                                        copied 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'hover:bg-purple-100 text-purple-600'
                                    }`}
                                    title="Copiar código"
                                >
                                    {copied ? (
                                        <>
                                            <span className="text-xs font-semibold">Copiado!</span>
                                            <MdCheckCircle className="w-5 h-5" />
                                        </>
                                    ) : (
                                        <MdContentCopy className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <p className="text-sm text-purple-700 mt-2">
                                {result.discountPercentage}% de descuento en tu compra
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-2">
                                <MdShield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-800 text-left">
                                    Tus datos están protegidos con cifrado AES-256-GCM.
                                    No compartiremos tu información con terceros.
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500">
                            Guarda este código y preséntalo al realizar tu compra en el menú ejecutivo.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <MdBusiness className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900">
                            Club de Afiliados
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Regístrate para obtener beneficios exclusivos
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre completo *
                            </label>
                            <div className="relative">
                                <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Tu nombre"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Teléfono *
                            </label>
                            <div className="relative">
                                <MdPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Tu teléfono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <div className="relative">
                                <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="tu@email.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Empresa *
                            </label>
                            <div className="relative">
                                <MdBusiness className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="company"
                                    value={form.company}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Nombre de tu empresa"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cargo
                            </label>
                            <div className="relative">
                                <MdWork className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="position"
                                    value={form.position}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Tu cargo en la empresa"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Registrando...' : 'Registrarme'}
                        </button>
                    </form>

                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <MdShield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-900">Protección de Datos</p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Tus datos están protegidos con cifrado AES-256-GCM.
                                    Al registrarte, aceptas nuestra política de privacidad.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AffiliateClubRegister() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <RegisterForm />
        </Suspense>
    );
}
