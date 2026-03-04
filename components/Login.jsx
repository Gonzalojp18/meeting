'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { MdVisibility, MdVisibilityOff, MdEmail, MdLock, MdArrowBack, MdKey } from 'react-icons/md';
import PoweredByTakeasy from './footer/PoweredByTakeasy';

const Login = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(null);
  const [isNavigateToRegister, setIsNavigateToRegister] = useState(false);
  const [validate, setValidate] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const ADMIN_VALIDATE = process.env.NEXT_PUBLIC_ADMIN_CODE;

  useEffect(() => {
    setIsAdmin(!!localStorage.getItem('admin'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false
      });

      if (result.ok) {
        router.push('/');
      } else {
        setError(result.error || 'Credenciales incorrectas');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleCode = (e) => {
    e.preventDefault();

    if (ADMIN_VALIDATE === validate) {
      localStorage.setItem('admin', validate);
      router.push('/register');
    } else {
      setError('Código incorrecto');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      {/* Header con flecha atrás */}
      <header className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <MdArrowBack className="w-6 h-6" />
          <span className="text-sm font-medium">Volver</span>
        </Link>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="Meeting Restobar"
              width={160}
              height={80}
              className="drop-shadow-sm"
            />
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
            <p className="text-sm text-gray-500 mt-1">Inicia sesión para continuar</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MdEmail className="w-5 h-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="Correo electrónico"
                value={credentials.email}
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
                }
              />
            </div>

            {/* Password field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MdLock className="w-5 h-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="Contraseña"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <MdVisibilityOff className="w-5 h-5" />
                ) : (
                  <MdVisibility className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Register section */}
          {!isAdmin && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                ¿Eres empleado?{' '}
                <button
                  onClick={() => setIsNavigateToRegister((prev) => !prev)}
                  className="text-orange-600 font-semibold hover:text-orange-700 transition-colors"
                >
                  Regístrate aquí
                </button>
              </p>

              {isNavigateToRegister && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 mb-3">
                    Ingresa el código de autorización
                  </p>
                  <form onSubmit={handleCode} className="flex gap-2">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MdKey className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        type="text"
                        value={validate}
                        onChange={(e) => setValidate(e.target.value)}
                        placeholder="Código"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Verificar
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* TakeasyGO Network Footer */}
      <footer className="flex justify-center pb-6">
        <PoweredByTakeasy variant="light" label="network" />
      </footer>
    </div>
  );
};

export default Login;
