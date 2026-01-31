'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import axios from 'axios';
import API_URI from '../utils/getApiUri';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';

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

    try {
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false
      });

      if (result.ok) {
        router.push('/');
      } else {
        setError(result.error || 'Error de autenticación');
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
      setError('Codigo Erroneo');
    }
  };

  return (
    <div className='min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50'>
      <div className='max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow'>
        <h2 className='text-center text-3xl font-extrabold text-gray-900'>
          Ingreso Administrador
        </h2>
        {error && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
            {error}
          </div>
        )}
        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          <div className='rounded-md shadow-sm -space-y-px'>
            <div>
              <label htmlFor='email' className='sr-only'>
                Correo Electronico
              </label>
              <input
                id='email'
                name='email'
                type='email'
                required
                className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm'
                placeholder='Correo Electronico'
                value={credentials.email}
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
                }
              />
            </div>
            <div className='relative'>
              <label htmlFor='password' className='sr-only'>
                Contraseña
              </label>
              <input
                id='password'
                name='password'
                type={showPassword ? 'text' : 'password'}
                required
                className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10'
                placeholder='Contraseña'
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-20'
              >
                {showPassword ? (
                  <MdVisibilityOff className='h-5 w-5' />
                ) : (
                  <MdVisibility className='h-5 w-5' />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type='submit'
              className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            >
              {loading ? 'Cargando...' : 'Enviar'}
            </button>
          </div>
        </form>

        {!isAdmin && (
          <div className='text-center text-base font-extrabold text-gray-500'>
            Registrate{' '}
            <span
              onClick={() => setIsNavigateToRegister((prev) => !prev)}
              className='cursor-pointer text-gray-900 underline'
            >
              aqui
            </span>
            {isNavigateToRegister && (
              <form
                onSubmit={handleCode}
                className='flex items-center justify-center'
              >
                <input
                  className='appearance-none rounded-none  w-full px-3 py-2 mt-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm'
                  type='text'
                  value={validate}
                  onChange={(e) => setValidate(e.target.value)}
                  placeholder='Ingresa el codigo privado'
                />
                <button type='submit' className='mt-2 ml-2 outline p-1 rounded'>
                  Confirmar
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
