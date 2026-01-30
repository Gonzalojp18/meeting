'use client'
import React, { useState, useEffect, useMemo } from 'react';
import CategoryItems from './admin/CategoryItems';
import CategoryManager from './admin/CategoryManager';
import PromotionManager from './PromotionManager';
import UserManagement from './admin/UserManagement';
import MercadoPagoSettings from './admin/MercadoPagoSettings';
import SalesReportExport from './admin/SalesReportExport';
import { LocationNav } from './navigation';
import { useFetch } from '../hooks/useFetch';
import axios from 'axios';
import { handleAxiosError } from '../utils/handleAxiosError';
import API_URI from '../utils/getApiUri'
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  MdSearch,
  MdClear,
  MdLogout,
  MdMenu,
  MdClose,
  MdDashboard,
  MdRestaurantMenu,
  MdCategory,
  MdLocalOffer,
  MdPeople,
  MdSettings,
  MdTrendingUp,
  MdTrendingDown,
  MdShowChart,
  MdWarning,
  MdCheckCircle,
  MdAttachMoney,
  MdDescription
} from 'react-icons/md';

const AdminPanel = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const token = session?.user?.token;
  const { data, loading, error, refetch } = useFetch(token ? `${API_URI}/api/menu` : null, token)

  useEffect(() => {
    if (status === 'unauthenticated' || error) {
      router.push('/login');
    }
  }, [status, error, router]);

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  // ========== MÉTRICAS DEL DASHBOARD (CALCULADAS) ==========
  const dashboardMetrics = useMemo(() => {
    const categoriesList = data?.categories || [];
    const totalProducts = categoriesList.reduce((sum, cat) => sum + (cat.items?.length || 0), 0);
    const totalCategories = categoriesList.length;

    // Simular promociones activas (esto debería venir del backend idealmente)
    const activePromotions = categoriesList.reduce((sum, cat) => {
      return sum + (cat.items?.filter(item => item.promotion)?.length || 0);
    }, 0);

    // Productos más populares (mock - en producción vendría del backend)
    const topProducts = categoriesList
      .flatMap(cat => (cat.items || []).map(item => ({ ...item, categoryName: cat.name })))
      .slice(0, 5);

    return {
      totalProducts,
      totalCategories,
      activePromotions,
      topProducts,
      // Mock data - en producción estos vendrían del backend
      todaySales: 0,
      monthSales: 0,
      salesTrend: 0
    };
  }, [data]);

  const authHeaders = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
  const categories = data?.categories || [];
  const locations = data?.locations || [];

  if (status === 'loading' || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-100"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500 absolute top-0"></div>
        </div>
        <p className="text-lg font-medium text-gray-700">Cargando panel...</p>
      </div>
    )
  }

  if (status === 'unauthenticated' || error) {
    return null;
  }

  // ========== HANDLERS DE ITEMS (SIN CAMBIOS) ==========
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

  // ========== HANDLERS DE CATEGORÍAS (SIN CAMBIOS) ==========
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


  // ========== CONFIGURACIÓN DE TABS ==========
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: MdDashboard },
    { id: 'products', label: 'Productos', icon: MdRestaurantMenu },
    { id: 'categories', label: 'Categorías', icon: MdCategory },
    { id: 'promotions', label: 'Promociones', icon: MdLocalOffer },
    { id: 'users', label: 'Usuarios', icon: MdPeople },
  ];

  if (session?.user?.role === 'admin') {
    tabs.push({ id: 'reports', label: 'Reportes', icon: MdDescription });
    tabs.push({ id: 'settings', label: 'Ajustes', icon: MdSettings });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ========== HEADER MEJORADO ========== */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3.5">
            {/* Left: Logo + Menu mobile */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <MdClose className="h-6 w-6 text-gray-700" />
                ) : (
                  <MdMenu className="h-6 w-6 text-gray-700" />
                )}
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-none">Meeting Resto Bar</h1>
                  <p className="text-xs text-gray-500 leading-none mt-0.5">Admin Panel</p>
                </div>
              </div>
            </div>

            {/* Center: Location selector (desktop) */}
            <div className="hidden lg:block">
              <LocationNav adminView={true} locations={locations} />
            </div>

            {/* Right: User + Logout */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-gray-900 leading-none truncate max-w-32">
                    {session?.user?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize leading-none mt-1">
                    {session?.user?.role || 'Sin rol'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2.5 hover:bg-red-50 rounded-xl transition-colors group border border-transparent hover:border-red-200"
                title="Cerrar Sesión"
              >
                <MdLogout className="h-5 w-5 text-gray-600 group-hover:text-red-600 transition-colors" />
              </button>
            </div>
          </div>

          {/* TABS - Desktop */}
          <div className="hidden lg:block px-4 lg:px-6 -mb-px overflow-x-auto scrollbar-hide">
            <nav className="flex space-x-1 min-w-max">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all
                      ${isActive
                        ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* ========== MOBILE MENU OVERLAY MEJORADO ========== */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del drawer */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">H</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">HÉNOS</h2>
                  <p className="text-xs text-gray-500">Panel de Administración</p>
                </div>
              </div>

              {/* User info en mobile */}
              <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-200">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {session?.user?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {session?.user?.role || 'Sin rol'}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ubicación</p>
              <LocationNav adminView={true} locations={locations} />
            </div>

            {/* Navigation */}
            <div className="p-3 overflow-y-auto max-h-[calc(100vh-280px)]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">Navegación</p>
              <div className="space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== BOTTOM NAV MOBILE ========== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.slice(0, 5).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px]
                  ${isActive ? 'text-orange-600' : 'text-gray-600'}
                `}
              >
                <div className={`
                  p-1.5 rounded-lg transition-all
                  ${isActive ? 'bg-orange-100' : 'bg-transparent'}
                `}>
                  <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : 'scale-100'}`} />
                </div>
                <span className="text-[10px] font-medium leading-none">
                  {tab.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ========== MAIN CONTENT ========== */}
      <main className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 pb-24 lg:pb-6">

        {/* ========== DASHBOARD TAB (NUEVO) ========== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Welcome header */}
            <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 rounded-2xl p-6 lg:p-8 text-white shadow-xl shadow-orange-500/20">
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">
                ¡Bienvenido, {session?.user?.name || 'Admin'}!
              </h2>
              <p className="text-orange-100 text-base lg:text-lg">
                Aquí tienes un resumen de tu restaurante
              </p>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {/* Total Productos */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <MdRestaurantMenu className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-2xl">🍽️</span>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Productos</p>
                <h3 className="text-3xl font-bold text-gray-900">{dashboardMetrics.totalProducts}</h3>
                <p className="text-xs text-gray-500 mt-2">
                  En {dashboardMetrics.totalCategories} categorías
                </p>
              </div>

              {/* Categorías */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <MdCategory className="h-6 w-6 text-purple-600" />
                  </div>
                  <span className="text-2xl">📂</span>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Categorías</p>
                <h3 className="text-3xl font-bold text-gray-900">{dashboardMetrics.totalCategories}</h3>
                <p className="text-xs text-gray-500 mt-2">
                  Activas en el menú
                </p>
              </div>

              {/* Promociones */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <MdLocalOffer className="h-6 w-6 text-orange-600" />
                  </div>
                  <span className="text-2xl">🏷️</span>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Promociones Activas</p>
                <h3 className="text-3xl font-bold text-gray-900">{dashboardMetrics.activePromotions}</h3>
                <p className="text-xs text-gray-500 mt-2">
                  En vigencia hoy
                </p>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-emerald-500 rounded-xl shadow-lg">
                    <MdCheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl">⚡</span>
                </div>
                <p className="text-sm font-semibold text-emerald-900 mb-3">Acciones Rápidas</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('products')}
                    className="w-full text-left text-xs font-medium text-emerald-700 hover:text-emerald-900 transition-colors py-1"
                  >
                    → Agregar producto
                  </button>
                  <button
                    onClick={() => setActiveTab('promotions')}
                    className="w-full text-left text-xs font-medium text-emerald-700 hover:text-emerald-900 transition-colors py-1"
                  >
                    → Crear promoción
                  </button>
                </div>
              </div>
            </div>

            {/* Top Products / Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Products */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Productos Recientes</h3>
                  <MdShowChart className="h-6 w-6 text-gray-400" />
                </div>

                {dashboardMetrics.topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardMetrics.topProducts.map((product, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-orange-600">#{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.categoryName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            ${product.price?.toLocaleString() || '0'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MdRestaurantMenu className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No hay productos aún</p>
                  </div>
                )}
              </div>

              {/* Alerts / Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Estado del Sistema</h3>
                  <MdCheckCircle className="h-6 w-6 text-emerald-500" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <MdCheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Todo funcionando</p>
                      <p className="text-xs text-emerald-700 mt-1">Sistema operativo sin problemas</p>
                    </div>
                  </div>

                  {dashboardMetrics.totalProducts === 0 && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <MdWarning className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Menú vacío</p>
                        <p className="text-xs text-amber-700 mt-1">Comienza agregando productos</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-3">Sugerencias</p>
                    <ul className="space-y-2">
                      <li className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span>Revisa tus promociones semanalmente</span>
                      </li>
                      <li className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span>Actualiza el menú según temporada</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== PRODUCTOS TAB ========== */}
        {activeTab === 'products' && (
          <>
            {/* Search bar mejorado */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar productos por nombre o descripción..."
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MdClear className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">{filteredCategories.length}</span>
                  <span>categorías encontradas</span>
                </div>
              </div>
            </div>

            {/* Products list */}
            <div className="space-y-6">
              {filteredCategories.length > 0 ? (
                filteredCategories.map(category => (
                  <div key={category._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
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
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                  <MdSearch className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron productos</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Intenta con otra búsqueda o limpia el filtro para ver todos los productos
                  </p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                  >
                    <MdClear className="h-5 w-5" />
                    Limpiar búsqueda
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========== CATEGORÍAS TAB ========== */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:p-8">
            <CategoryManager
              categories={categories}
              locations={locations}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          </div>
        )}

        {/* ========== PROMOCIONES TAB ========== */}
        {activeTab === 'promotions' && (
          <div className="space-y-6">
            {/* Header con métrica */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-orange-900 mb-1">Gestión de Promociones</h2>
                  <p className="text-sm text-orange-700">
                    {dashboardMetrics.activePromotions} promociones activas
                  </p>
                </div>
                <div className="p-4 bg-orange-500 rounded-xl shadow-lg">
                  <MdLocalOffer className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            {categories.length > 0 ? (
              categories.map(category => (
                <div key={category._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:p-8 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <MdCategory className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
                    <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {category.items?.length || 0} productos
                    </span>
                  </div>
                  <PromotionManager category={category} />
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <MdLocalOffer className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay categorías disponibles</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Crea categorías primero para poder gestionar promociones
                </p>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                >
                  <MdCategory className="h-5 w-5" />
                  Ir a Categorías
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========== USUARIOS TAB ========== */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-purple-900 mb-1">Gestión de Usuarios</h2>
                  <p className="text-sm text-purple-700">Administra los accesos al panel</p>
                </div>
                <div className="p-4 bg-purple-500 rounded-xl shadow-lg">
                  <MdPeople className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <UserManagement locations={locations} />
          </div>
        )}

        {/* ========== REPORTES TAB ========== */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Reportes de Ventas</h2>
                  <p className="text-sm text-gray-700">Genera y exporta reportes detallados en PDF y Excel</p>
                </div>
                <div className="p-4 bg-orange-500 rounded-xl shadow-lg">
                  <MdDescription className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8">
              <SalesReportExport locations={locations} />
            </div>
          </div>
        )}

        {/* ========== AJUSTES TAB ========== */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Configuración del Sistema</h2>
                  <p className="text-sm text-gray-700">Ajustes generales y configuraciones</p>
                </div>
                <div className="p-4 bg-gray-700 rounded-xl shadow-lg">
                  <MdSettings className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8">
              <MercadoPagoSettings />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;