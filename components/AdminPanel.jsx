'use client'
import React, { useState, useEffect } from 'react';
import CategoryItems from './admin/CategoryItems';
import PromotionManager from './PromotionManager';
import UserManagement from './admin/UserManagement';
import { LocationNav } from './navigation';
import { useFetch } from '../hooks/useFetch';
import axios from 'axios';
import { handleAxiosError } from '../utils/handleAxiosError';
import Link from 'next/link';
import API_URI from '../utils/getApiUri'
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { MdSearch, MdClear, MdLogout } from 'react-icons/md';

const AdminPanel = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');

  const token = session?.user?.token;
  const { data, loading, error, refetch } = useFetch(`${API_URI}/api/menu`, token)

  useEffect(() => {
    if (status === 'unauthenticated' || error) {
      router.push('/login');
    }
  }, [status, error, router]);

  if (status === 'loading' || loading) {
    return <div>Loading...</div>
  }

  if (status === 'unauthenticated' || error) {
    return null;
  }

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const handleAddItem = async (categoryId, itemData) => {
    try {
      await axios.post(`${API_URI}/api/menu/category/${categoryId}/item`, itemData, authHeaders)
      refetch()
    } catch (error) {
      handleAxiosError(error)
    }
  };

  const handleUpdateItem = async (categoryId, itemId, itemData) => {
    try {
      await axios.put(`${API_URI}/api/menu/category/${categoryId}/item/${itemId}`, itemData, authHeaders)
      refetch()
    } catch (error) {
      handleAxiosError(error)
    }
  };

  const handleDeleteItem = async (categoryId, itemId) => {
    try {
      await axios.delete(`${API_URI}/api/menu/category/${categoryId}/item/${itemId}`, authHeaders)
      refetch()
    } catch (error) {
      handleAxiosError(error)
    }
  };

  const filteredCategories = searchTerm === ''
    ? data.categories
    : data.categories.map(category => {
      const filteredItems = category.items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { ...category, items: filteredItems };
    }).filter(category => category.items.length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-gray-200 min-h-screen">
      {/* Header con usuario y logout */}
      <div className="mb-4 bg-gray-800 p-4 shadow sm:rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
            {session?.user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div>
            <p className="text-white font-medium">{session?.user?.name || 'Usuario'}</p>
            <p className="text-gray-400 text-sm">{session?.user?.role || 'Sin rol'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <MdLogout size={20} />
          Cerrar Sesión
        </button>
      </div>

      <div className="mb-8 bg-white p-6 shadow sm:rounded-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Configuración de Ubicación</h2>
          <LocationNav adminView={true} locations={data.locations} />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Seleccione la ubicación para administrar los menús y precios específicos.
        </p>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${activeTab === 'products'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Productos
            </button>
            <button
              onClick={() => setActiveTab('promotions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${activeTab === 'promotions'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Promociones
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${activeTab === 'users'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Usuarios
            </button>
          </nav>

          {activeTab === 'products' && (
            <div className="relative w-full md:w-96 pb-2 md:pb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MdSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar platos por nombre o descripción..."
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-all duration-200 shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <MdClear className="h-5 w-5 text-gray-400 hover:text-orange-500 cursor-pointer" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'products' ? (
        <div className="space-y-8">
          {filteredCategories.length > 0 ? (
            filteredCategories.map(category => (
              <div key={category._id} className="bg-white shadow sm:rounded-lg p-6">
                <CategoryItems
                  category={category}
                  locations={data.locations}
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white shadow sm:rounded-lg">
              <MdSearch className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
              <p className="mt-1 text-sm text-gray-500">
                No hay platos que coincidan con tu búsqueda "{searchTerm}".
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setSearchTerm('')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Limpiar búsqueda
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'promotions' ? (
        <div className="space-y-8">
          {data.categories.map(category => (
            <div key={category._id} className="bg-white shadow sm:rounded-lg p-6">
              <h3 className="text-2xl font-medium leading-6 text-gray-900 mb-4">{category.name}</h3>
              <PromotionManager category={category} />
            </div>
          ))}
        </div>
      ) : (
        <UserManagement locations={data.locations} />
      )}
    </div>
  );
};

export default AdminPanel;
