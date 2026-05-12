'use client'
import React, { useState, useEffect, useMemo } from 'react';
import PoweredByTakeasy from './footer/PoweredByTakeasy';
import CategoryItems from './admin/CategoryItems';
import CategoryManager from './admin/CategoryManager';
// import PromotionManager from './PromotionManager';
import UpsellingManager from './admin/UpsellingManager';
import UserManagement from './admin/UserManagement';
import MercadoPagoSettings from './admin/MercadoPagoSettings';
import TakeawaySettings from './admin/TakeawaySettings';
import QrPromoConfig from './admin/QrPromoConfig';
import ScheduledOrdersConfig from './admin/ScheduledOrdersConfig';
import BulkPriceUpdate from './admin/BulkPriceUpdate';
import GlobalDefaultsManager from './admin/GlobalDefaultsManager';
import { LocationNav } from './navigation';
import StatsGrid from './admin/StatsGrid';
import TopItemsList from './admin/TopItemsList';
import ReportFilters from './admin/ReportFilters';
import SalesReportExport from './admin/SalesReportExport';
import PrinterManagement from './admin/PrinterManagement';
import TicketHistory from './admin/TicketHistory';
import StaffAvailability from './admin/StaffAvailability';
import AuditLogViewer from './admin/AuditLogViewer';
import RefundManagement from './admin/RefundManagement';
import AdminOperationsKpi from './admin/AdminOperationsKpi';
import AdminAffiliateClub from './admin/AdminAffiliateClub';
import HelpButton from './help/HelpButton';
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
  MdDescription,
  MdPointOfSale,
  MdLocationOn,
  MdPrint,
  MdHistory,
  MdSecurity,
  MdAutoGraph,
  MdSchedule,
  MdPriceChange,
  MdBusiness,
} from 'react-icons/md';
import CashierPanel from './cashier/CashierPanel';

const AdminPanel = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const isStaff = session?.user?.role === 'staff';
  const isAdmin = session?.user?.role === 'admin';
  const isManager = session?.user?.role === 'manager';
  const hasFullAccess = isAdmin || isManager; // Manager tiene casi los mismos accesos que admin

  const [activeTab, setActiveTab] = useState(isStaff ? 'caja' : 'dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadLeadsCount, setUnreadLeadsCount] = useState(0);
  const audioRef = React.useRef(null);
  const previousCountRef = React.useRef(0);

  // Stats Dashboard State
  const [dashboardLocation, setDashboardLocation] = useState('');
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Selector de tipo de menú
  const [currentMenuType, setCurrentMenuType] = useState('standard');

  const token = session?.user?.token;
  const { data, loading, error, refetch } = useFetch(token ? `${API_URI}/api/menu?type=${currentMenuType}` : null, token)

  useEffect(() => {
    if (status === 'unauthenticated' || error) {
      router.push('/login');
    }
  }, [status, error, router]);

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  // Fetch Stats for Dashboard
  useEffect(() => {
    const role = session?.user?.role;
    const canViewStats = ['admin', 'manager', 'superadmin'].includes(role);

    if (activeTab === 'dashboard' && token && canViewStats) {
      const fetchDashboardStats = async () => {
        setStatsLoading(true);
        try {
          // Default: Mes actual
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          const todayStr = today.toISOString().split('T')[0];

          let url = `/api/admin/reports/stats?startDate=${startOfMonth}&endDate=${todayStr}`;
          if (dashboardLocation) url += `&locationId=${dashboardLocation}`;

          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) {
            console.warn('[AdminPanel] Stats API returned', res.status, '— skipping.');
            return;
          }
          const data = await res.json();
          setStatsData(data);
        } catch (err) {
          console.error('Error fetching dashboard stats:', err);
        } finally {
          setStatsLoading(false);
        }
      };
      fetchDashboardStats();
    }
  }, [activeTab, token, dashboardLocation, session]);

  // Polling for new affiliate leads (Admin only)
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio('/camera.mp3');
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || !token) return;

    const checkNewLeads = async () => {
      try {
        const res = await fetch(`${API_URI}/api/admin/affiliate-club/leads?status=new`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const currentCount = data.leads?.length || 0;
          
          if (currentCount > previousCountRef.current) {
            // New lead assigned! Play sound
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.warn('Autoplay blocked:', e));
            }
          }
          
          previousCountRef.current = currentCount;
          setUnreadLeadsCount(currentCount);
        }
      } catch (err) {
        console.error('Error polling leads:', err);
      }
    };

    // Check immediately, then every 30 seconds
    checkNewLeads();
    const interval = setInterval(checkNewLeads, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, token]);

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
      alert('Error al agregar el producto. Verifica que todos los precios estén completos.')
    }
  };

  const handleUpdateItem = async (categoryId, itemId, itemData) => {
    try {
      await axios.put(`${API_URI}/api/menu/category/${categoryId}/item/${itemId}`, itemData, authHeaders)
      refetch()
    } catch (error) {
      handleAxiosError(error)
      alert('Error al actualizar el producto.')
    }
  };

  const handleDeleteItem = async (categoryId, itemId) => {
    try {
      await axios.delete(`${API_URI}/api/menu/category/${categoryId}/item/${itemId}`, authHeaders)
      refetch()
    } catch (error) {
      handleAxiosError(error)
      alert('Error al eliminar el producto.')
    }
  };

  // ========== HANDLERS DE CATEGORÍAS ==========
  const handleAddCategory = async (categoryData) => {
    try {
      await axios.post(`${API_URI}/api/menu/category?type=${currentMenuType}`, categoryData, authHeaders);
      refetch();
    } catch (error) {
      handleAxiosError(error);
      alert('Error al crear la categoría.')
    }
  };

  const handleUpdateCategory = async (categoryId, categoryData) => {
    try {
      await axios.put(`${API_URI}/api/menu/category/${categoryId}`, categoryData, authHeaders);
      refetch();
    } catch (error) {
      handleAxiosError(error);
      alert('Error al actualizar la categoría.')
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axios.delete(`${API_URI}/api/menu/category/${categoryId}`, authHeaders);
      refetch();
    } catch (error) {
      handleAxiosError(error);
      alert('Error al eliminar la categoría.')
    }
  };

  // ========== HANDLER DE REORDENAMIENTO ==========
  const handleReorder = async (type, orderedIds, categoryId = null) => {
    try {
      await axios.put(`${API_URI}/api/menu/reorder`, {
        type,
        categoryId,
        orderedIds
      }, authHeaders);
      refetch();
    } catch (error) {
      handleAxiosError(error);
      alert('Error al reordenar.');
      refetch(); // Revert optimistic UI on error
    }
  };

  const filteredCategories = categories
    .filter(category => categoryFilter === '' || category._id === categoryFilter)
    .map(category => {
      if (searchTerm === '') return category;
      const categoryItems = category.items || [];
      const filteredItems = categoryItems.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { ...category, items: filteredItems };
    })
    .filter(category => {
      // Si estamos buscando textualmente, ocultar las categorías que quedaron sin productos
      if (searchTerm !== '') return (category.items || []).length > 0;
      // Si no hay búsqueda de texto, mostrar todas las categorías, incluso las vacías
      return true;
    });


  // ========== CONFIGURACIÓN DE TABS DINÁMICA ==========
  const tabs = [];

  // Admin y Manager tienen acceso completo (excepto MP Settings para manager)
  if (hasFullAccess) {
    tabs.push({ id: 'dashboard', label: 'Dashboard', icon: MdDashboard });
    tabs.push({ id: 'metricas', label: 'Metricas', icon: MdShowChart });
    tabs.push({ id: 'products', label: 'Productos', icon: MdRestaurantMenu });
    tabs.push({ id: 'categories', label: 'Categorias', icon: MdCategory });
    tabs.push({ id: 'bulk-prices', label: 'Precios Masivos', icon: MdPriceChange });
    tabs.push({ id: 'upselling', label: 'Upselling', icon: MdAutoGraph });
    tabs.push({ id: 'marketing-qr', label: 'Marketing QR', icon: MdLocalOffer });
    tabs.push({ id: 'scheduled-orders', label: 'Pedidos Programados', icon: MdSchedule });
    tabs.push({ id: 'affiliate-club', label: 'Club Afiliados', icon: MdBusiness });
    tabs.push({ id: 'users', label: 'Usuarios', icon: MdPeople });
    tabs.push({ id: 'reports', label: 'Reportes', icon: MdDescription });
    tabs.push({ id: 'refunds', label: 'Reembolsos', icon: MdAttachMoney });
    tabs.push({ id: 'settings', label: 'Ajustes', icon: MdSettings });
  }

  // Solo admin tiene acceso a Auditoría
  if (isAdmin) {
    tabs.push({ id: 'audit', label: 'Auditoría', icon: MdSecurity });
  }

  // Todos los roles tienen acceso a Caja
  tabs.push({ id: 'caja', label: 'Caja', icon: MdPointOfSale });

  // Staff y Admin tienen acceso a Impresoras, Historial, y control de disponibilidad (temporalmente para admin también)
  if (isStaff || isAdmin) {
    tabs.push({ id: 'availability', label: 'Disponibilidad', icon: MdRestaurantMenu });
    tabs.push({ id: 'printers', label: 'Impresoras', icon: MdPrint });
    tabs.push({ id: 'history', label: 'Historial', icon: MdHistory });
  }

  // Grupos de navegación para el sidebar
  const navGroups = [
    { label: 'Principal', ids: ['dashboard', 'metricas'] },
    { label: 'Menu', ids: ['products', 'categories', 'bulk-prices', 'upselling'] },
    { label: 'Marketing', ids: ['marketing-qr', 'scheduled-orders', 'affiliate-club'] },
    { label: 'Operaciones', ids: ['caja', 'availability', 'printers', 'history'] },
    { label: 'Personal', ids: ['users'] },
    { label: 'Finanzas', ids: ['reports', 'refunds'] },
    { label: 'Sistema', ids: ['settings', 'audit'] },
  ].map(g => ({ ...g, tabs: tabs.filter(t => g.ids.includes(t.id)) }))
   .filter(g => g.tabs.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ========== SIDEBAR - Solo Desktop ========== */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 z-40 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="w-9 h-9 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <span className="text-white font-bold">M</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Meeting Resto Bar</h1>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Sede */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Sede</p>
          <LocationNav adminView={true} locations={locations} />
        </div>

        {/* Navegación agrupada */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-orange-500' : ''}`} />
                      <span>{tab.label}</span>
                      {tab.id === 'affiliate-club' && unreadLeadsCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                          {unreadLeadsCount}
                        </span>
                      )}
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Usuario + Logout */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {session?.user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate leading-none">{session?.user?.name || 'Usuario'}</p>
              <p className="text-[10px] text-gray-400 capitalize leading-none mt-0.5">{session?.user?.role || ''}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              title="Cerrar Sesión"
            >
              <MdLogout className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm lg:pl-64">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3.5">
            {/* Left: Logo + Menu mobile (solo mobile, sidebar lo reemplaza en desktop) */}
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
              <div className="flex items-center gap-3 lg:hidden">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-none">Meeting Resto Bar</h1>
                  <p className="text-xs text-gray-500 leading-none mt-0.5">Admin Panel</p>
                </div>
              </div>
              {/* Desktop: título de la sección activa */}
              <div className="hidden lg:flex items-center gap-2">
                {(() => { const t = tabs.find(t => t.id === activeTab); const Icon = t?.icon; return Icon ? <><Icon className="h-5 w-5 text-gray-400" /><span className="text-sm font-semibold text-gray-700">{t.label}</span></> : null; })()}
              </div>
            </div>

            {/* Center: Location selector (solo mobile) */}
            <div className="hidden">
              <LocationNav adminView={true} locations={locations} />
            </div>

            {/* Right: User + Logout (solo mobile, sidebar lo tiene en desktop) */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="hidden md:flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              </div>
              <HelpButton />
              <button
                onClick={handleLogout}
                className="p-2.5 hover:bg-red-50 rounded-xl transition-colors group border border-transparent hover:border-red-200"
                title="Cerrar Sesión"
              >
                <MdLogout className="h-5 w-5 text-gray-600 group-hover:text-red-600 transition-colors" />
              </button>
            </div>

            {/* Desktop: solo HelpButton */}
            <div className="hidden lg:flex items-center gap-2">
              <HelpButton />
            </div>
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
                      {tab.id === 'affiliate-club' && unreadLeadsCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                          {unreadLeadsCount}
                        </span>
                      )}
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
          {tabs.slice(0, 6).map(tab => {
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
                  p-1.5 rounded-lg transition-all relative
                  ${isActive ? 'bg-orange-100' : 'bg-transparent'}
                `}>
                  <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : 'scale-100'}`} />
                  {tab.id === 'affiliate-club' && unreadLeadsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-sm">
                      {unreadLeadsCount}
                    </span>
                  )}
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
      <main className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 pb-24 lg:pb-6 lg:pl-72">

        {/* ========== DASHBOARD TAB (Admin y Manager) ========== */}
        {activeTab === 'dashboard' && hasFullAccess && (
          <div className="space-y-6 animate-fadeIn">
            {/* Welcome header */}
            <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-black rounded-2xl p-6 lg:p-8 text-white shadow-xl shadow-gray-900/10 border border-gray-700 relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-black mb-2 tracking-tight">
                    ¡Bienvenido, <span className="text-orange-500">{session?.user?.name || 'Admin'}</span>!
                  </h2>
                  <p className="text-gray-400 text-base lg:text-lg font-medium">
                    Resumen de rendimiento del mes actual
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-gray-800/50 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-700/50 shadow-inner group">
                  <MdLocationOn className="text-orange-500 h-5 w-5 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Sede Seleccionada</span>
                    <select
                      value={dashboardLocation}
                      onChange={(e) => setDashboardLocation(e.target.value)}
                      className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer pr-4"
                    >
                      <option value="" className="bg-gray-800">Todas las Sedes</option>
                      {locations.map(loc => (
                        <option key={loc._id} value={loc.nameId} className="bg-gray-800">{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Decoración de fondo */}
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <MdShowChart className="h-32 w-32 text-orange-500" />
              </div>
            </div>

            {/* Stats Grid Principal */}
            {statsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl border border-gray-200" />
                ))}
              </div>
            ) : (
              <StatsGrid summary={statsData?.summary} deliveryStats={statsData?.deliveryStats} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Panel Izquierdo: Métricas del Menú y Acciones */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Catálogo */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                        <MdRestaurantMenu size={24} />
                      </div>
                      <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-100">Catálogo</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Productos en Menú</p>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-3xl font-black text-gray-900">{dashboardMetrics.totalProducts}</h4>
                      <span className="text-sm font-bold text-gray-400">ítems activos</span>
                    </div>
                  </div>

                  {/* Promociones */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                        <MdLocalOffer size={24} />
                      </div>
                      <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-indigo-100">Marketing</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Promo Activas</p>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-3xl font-black text-gray-900">{dashboardMetrics.activePromotions}</h4>
                      <span className="text-sm font-bold text-gray-400">campañas</span>
                    </div>
                  </div>
                </div>

                {/* Acciones Rápidas */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
                  <div className="relative z-10">
                    <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                      <MdSearch className="h-5 w-5" /> Acciones de Gestión
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Gestionar Productos', tab: 'products', icon: MdRestaurantMenu },
                        { label: 'Ver Upselling', tab: 'upselling', icon: MdAutoGraph },
                        { label: 'Control de Caja', tab: 'caja', icon: MdPointOfSale },
                      ].map((action, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveTab(action.tab)}
                          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20 transition-all font-bold text-sm text-white group/btn"
                        >
                          <action.icon className="h-4 w-4 text-emerald-300 group-hover/btn:scale-125 transition-transform" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="absolute -bottom-6 -right-6 opacity-10 scale-150 rotate-12">
                    <MdCheckCircle className="h-32 w-32" />
                  </div>
                </div>
              </div>

            </div>

            {/* Alerts / Info - Integrated into Dashboard */}
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
              </div>
            </div>
          </div>
        )}

        {/* ========== MÉTRICAS OPERACIONALES TAB (Admin y Manager) ========== */}
        {activeTab === 'metricas' && hasFullAccess && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Métricas Operacionales</h2>
                  <p className="text-sm text-gray-600">Horas pico, preparación, tiempo de retiro y ciclo completo</p>
                </div>
                <div className="p-4 bg-orange-500 rounded-xl shadow-lg">
                  <MdShowChart className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8">
              <AdminOperationsKpi />
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <>
            {/* Search bar mejorado */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {/* Selector de modo de menú */}
                  <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                    <button
                      onClick={() => setCurrentMenuType('standard')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentMenuType === 'standard' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Estándar
                    </button>
                    <button
                      onClick={() => setCurrentMenuType('executive')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentMenuType === 'executive' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      B2B Ejecutivo
                    </button>
                  </div>
                  {/* Buscador por nombre */}
                  <div className="relative w-full sm:w-72">
                    <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre o descripción..."
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

                  {/* Filtro por categoría */}
                  <div className="relative w-full sm:w-56">
                    <MdCategory className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm appearance-none bg-white cursor-pointer"
                    >
                      <option value="">Todas las categorías</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
                  {(searchTerm || categoryFilter) && (
                    <button
                      onClick={() => { setSearchTerm(''); setCategoryFilter(''); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <MdClear className="h-3.5 w-3.5" />
                      Limpiar filtros
                    </button>
                  )}
                  <span className="font-medium">{filteredCategories.length}</span>
                  <span>categorías encontradas</span>
                </div>
              </div>
            </div>

            {/* Administrador de opciones globales (Inyección automática) */}
            <GlobalDefaultsManager 
              initialCustomizations={data?.defaultCustomizations || []}
              menuType={currentMenuType}
              token={token}
              onUpdate={refetch}
            />

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
                      onReorderItems={(orderedIds) => handleReorder('items', orderedIds, category._id)}
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                  <MdSearch className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron productos</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Intenta con otra búsqueda o limpia los filtros para ver todos los productos
                  </p>
                  <button
                    onClick={() => { setSearchTerm(''); setCategoryFilter(''); }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                  >
                    <MdClear className="h-5 w-5" />
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </>
        )
        }

        {/* ========== CATEGORÍAS TAB ========== */}
        {
          activeTab === 'categories' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:p-8">
              <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 w-fit mb-6">
                <button
                  onClick={() => setCurrentMenuType('standard')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentMenuType === 'standard' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Estándar
                </button>
                <button
                  onClick={() => setCurrentMenuType('executive')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentMenuType === 'executive' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  B2B Ejecutivo
                </button>
              </div>
              <CategoryManager
                categories={categories}
                locations={locations}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onReorderCategories={(orderedIds) => handleReorder('categories', orderedIds)}
              />
            </div>
          )
        }

        {/* ========== PRECIOS MASIVOS TAB ========== */}
        {
          activeTab === 'bulk-prices' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:p-8">
              <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 w-fit mb-6">
                <button
                  onClick={() => setCurrentMenuType('standard')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentMenuType === 'standard' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Estándar
                </button>
                <button
                  onClick={() => setCurrentMenuType('executive')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentMenuType === 'executive' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  B2B Ejecutivo
                </button>
              </div>
              <BulkPriceUpdate
                data={data}
                menuType={currentMenuType}
                locations={locations}
                onRefetch={refetch}
              />
            </div>
          )
        }

        {/* ========== UPSELLING TAB ========== */}
        {
          activeTab === 'upselling' && (
            <div className="space-y-6">
              {/* Header con métrica */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-100 rounded-xl border border-emerald-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-900 mb-1">Upselling Inteligente</h2>
                    <p className="text-sm text-emerald-700">
                      Gestiona las sugerencias automáticas para aumentar el ticket promedio
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-500 rounded-xl shadow-lg">
                    <MdAutoGraph className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>

              <UpsellingManager />
            </div>
          )
        }

        {/* ========== MARKETING QR TAB ========== */}
        {activeTab === 'marketing-qr' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-orange-900 mb-1">Marketing QR</h2>
                  <p className="text-sm text-orange-700">Configura promociones y banners para escaneos de QR por sede</p>
                </div>
                <div className="p-4 bg-orange-500 rounded-xl shadow-lg">
                  <MdLocalOffer className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8">
              <QrPromoConfig locations={locations} />
            </div>
          </div>
        )}

        {/* ========== SCHEDULED ORDERS TAB ========== */}
        {activeTab === 'scheduled-orders' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-blue-900 mb-1">Pedidos Programados</h2>
                  <p className="text-sm text-blue-700">Configura horarios y capacidad de pedidos programados por sede</p>
                </div>
                <div className="p-4 bg-blue-500 rounded-xl shadow-lg">
                  <MdSchedule className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <div className="p-6 lg:p-8">
              <ScheduledOrdersConfig locations={locations} token={token} onRefetch={refetch} />
            </div>
          </div>
        )}

        {/* ========== CLUB AFILIADOS TAB ========== */}
        {activeTab === 'affiliate-club' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:p-8">
            <AdminAffiliateClub />
          </div>
        )}

        {/* ========== USUARIOS TAB ========== */}
        {
          activeTab === 'users' && (
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
          )
        }

        {/* ========== REPORTES TAB ========== */}
        {
          activeTab === 'reports' && (
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
          )
        }

        {/* ========== AJUSTES TAB ========== */}
        {
          activeTab === 'settings' && (
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
              <div className="p-6 lg:p-8 space-y-8">
                {/* MercadoPago Settings: SOLO para admin */}
                {isAdmin && <MercadoPagoSettings />}
                {isManager && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                    <MdSettings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium">Credenciales de Mercado Pago</p>
                    <p className="text-sm">Solo el administrador puede modificar las credenciales de pago</p>
                  </div>
                )}
                <TakeawaySettings />
              </div>
            </div>
          )
        }

        {/* ========== CAJA TAB ========== */}
        {
          activeTab === 'caja' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-gray-700 p-6 shadow-lg shadow-gray-900/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Centro de Control de Pedidos</h2>
                    <p className="text-sm text-gray-400">Monitorea y gestiona los pedidos de todas las sedes en tiempo real</p>
                  </div>
                  <div className="p-4 bg-orange-500 rounded-xl shadow-lg ring-4 ring-orange-500/20">
                    <MdPointOfSale className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[600px]">
                <CashierPanel standalone={false} />
              </div>
            </div>
          )
        }

        {/* ========== DISPONIBILIDAD TAB (Solo Staff) ========== */}
        {
          activeTab === 'availability' && isStaff && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 lg:p-8">
                <StaffAvailability />
              </div>
            </div>
          )
        }

        {/* ========== PRINTERS TAB ========== */}
        {
          activeTab === 'printers' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-indigo-900 mb-1">Gestión de Impresoras</h2>
                    <p className="text-sm text-indigo-700">Configuración de impresoras térmicas, roles y pruebas</p>
                  </div>
                  <div className="p-4 bg-indigo-500 rounded-xl shadow-lg">
                    <MdPrint className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-6 lg:p-8">
                <PrinterManagement locations={locations} />
              </div>
            </div>
          )
        }

        {/* ========== HISTORY TAB ========== */}
        {
          activeTab === 'history' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Historial de Tickets</h2>
                    <p className="text-sm text-gray-700">Auditoría de impresiones, reimpresiones y estados</p>
                  </div>
                  <div className="p-4 bg-gray-600 rounded-xl shadow-lg">
                    <MdHistory className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-6 lg:p-8">
                <TicketHistory locations={locations} />
              </div>
            </div>
          )
        }

        {/* ========== REEMBOLSOS TAB (Admin y Manager) ========== */}
        {activeTab === 'refunds' && hasFullAccess && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8 animate-fadeIn">
            <RefundManagement />
          </div>
        )}

        {/* ========== AUDITORÍA TAB (Solo Admin) ========== */}
        {
          activeTab === 'audit' && isAdmin && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Registro de Auditoría</h2>
                    <p className="text-sm text-slate-700">Historial de acciones y cambios realizados por los usuarios</p>
                  </div>
                  <div className="p-4 bg-slate-700 rounded-xl shadow-lg">
                    <MdSecurity className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-6 lg:p-8">
                <AuditLogViewer />
              </div>
            </div>
          )
        }
      </main>

      {/* ========== TAKEASYGO NETWORK FOOTER ========== */}
      <footer className="hidden lg:flex items-center justify-center py-3 border-t border-gray-100 bg-white lg:pl-64">
        <PoweredByTakeasy variant="light" label="network" />
      </footer>
    </div>
  );
};

export default AdminPanel;