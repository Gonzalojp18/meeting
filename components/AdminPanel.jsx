'use client'
import React, { useState, useEffect } from 'react';
import CategoryItems from './admin/CategoryItems';
import CategoryManager from './admin/CategoryManager';
import PromotionManager from './PromotionManager';
import UserManagement from './admin/UserManagement';
import { LocationNav } from './navigation';
import { useFetch } from '../hooks/useFetch';
import axios from 'axios';
import { handleAxiosError } from '../utils/handleAxiosError';
import API_URI from '../utils/getApiUri'
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { MdSearch, MdClear, MdLogout, MdMenu, MdClose } from 'react-icons/md';

const AdminPanel = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const token = session?.user?.token;
  const { data, loading, error, refetch } = useFetch(token ? `${API_URI}/api/menu` : null, token)

  useEffect(() => {
    if (status === 'unauthenticated' || error) {
      router.push('/login');
    }
  }, [status, error, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        <p className="text-base text-gray-600">Cargando panel...</p>
      </div>
    )
  }

  if (status === 'unauthenticated' || error) {
    return null;
  }

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const categories = data?.categories || [];
  const locations = data?.locations || [];

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  // ========== HANDLERS DE ITEMS ==========
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

  // ========== HANDLERS DE CATEGORÍAS ==========
  const handleAddCategory = async (categoryData) => {
    try {
      await axios.post(`${API_URI}/api/menu/category`, categoryData, authHeaders);
      refetch();
    } catch (error) {
      handleAxiosError(error);
    }
  };

  const handleUpdateCategory = async (categoryId, categoryData) => {
    try {
      await axios.put(`${API_URI}/api/menu/category/${categoryId}`, categoryData, authHeaders);
      refetch();
    } catch (error) {
      handleAxiosError(error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axios.delete(`${API_URI}/api/menu/category/${categoryId}`, authHeaders);
      refetch();
    } catch (error) {
      handleAxiosError(error);
    }
  };

  const filteredCategories = searchTerm === ''
    ? categories
    : categories.map(category => {
      const categoryItems = category.items || [];
      const filteredItems = categoryItems.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { ...category, items: filteredItems };
    }).filter(category => (category.items || []).length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER - Sticky, modern, minimal */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left: Logo + Menu mobile */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? (
                  <MdClose className="h-6 w-6 text-gray-700" />
                ) : (
                  <MdMenu className="h-6 w-6 text-gray-700" />
                )}
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">H</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900">HÉNOS</h1>
                  <p className="text-xs text-gray-500">Admin Panel</p>
                </div>
              </div>
            </div>

            {/* Center: Location selector (desktop) */}
            <div className="hidden lg:block">
              <LocationNav adminView={true} locations={locations} />
            </div>

            {/* Right: User + Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                    {session?.user?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {session?.user?.role || 'Sin rol'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                title="Cerrar Sesión"
              >
                <MdLogout className="h-5 w-5 text-gray-600 group-hover:text-red-600" />
              </button>
            </div>
          </div>

          {/* TABS - Horizontal scroll mobile */}
          <div className="px-4 -mb-px overflow-x-auto scrollbar-hide">
            <nav className="flex space-x-6 min-w-max">
              <button
                onClick={() => setActiveTab('products')}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'products'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Productos
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'categories'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Categorías
              </button>
              <button
                onClick={() => setActiveTab('promotions')}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'promotions'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Promociones
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'users'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Usuarios
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute left-0 top-16 bottom-0 w-64 bg-white shadow-xl p-4" onClick={e => e.stopPropagation()}>
            <div className="mb-4 pb-4 border-b">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Ubicación</p>
              <LocationNav adminView={true} locations={locations} />
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('products')
                  setMobileMenuOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'products' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Productos
              </button>
              <button
                onClick={() => {
                  setActiveTab('categories')
                  setMobileMenuOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'categories' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Categorías
              </button>
              <button
                onClick={() => {
                  setActiveTab('promotions')
                  setMobileMenuOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'promotions' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Promociones
              </button>
              <button
                onClick={() => {
                  setActiveTab('users')
                  setMobileMenuOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'users' ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Usuarios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search bar - Solo en tab de productos */}
        {activeTab === 'products' && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <MdClear className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* CONTENIDO DE TABS */}
        {activeTab === 'categories' ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <CategoryManager
              categories={categories}
              locations={locations}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          </div>
        ) : activeTab === 'products' ? (
          <div className="space-y-6">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(category => (
                <div key={category._id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <CategoryItems
                    category={category}
                    locations={locations}
                    onAddItem={handleAddItem}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <MdSearch className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-base font-medium text-gray-900">No se encontraron productos</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Intenta con otra búsqueda o{' '}
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    limpia el filtro
                  </button>
                </p>
              </div>
            )}
          </div>
        ) : activeTab === 'promotions' ? (
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category._id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{category.name}</h3>
                <PromotionManager category={category} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <UserManagement locations={locations} />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;