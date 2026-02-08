'use client'
import React, { useState, useCallback, useEffect } from 'react';
import { useFetch } from '../hooks/useFetch';
import CategoryDisplay from './categories/CategoryDisplay';
import { CategoryNav } from './navigation';
import TakeawayNav from './navigation/TakeawayNav';
import BrandsSection from './brands/BrandsSection';
import Image from 'next/image';

// import Promotion from './promo/Promotions' // TODO: Comentado temporalmente para takeaway
import { FullScreenError } from './Error'
import { MainFooter } from './footer';
import { LocationsSection } from './location';
import { useRouter } from 'next/navigation';
import API_URI from '../utils/getApiUri'
import WeatherWidget from './Weather/WeatherWidget'
import { motion } from 'framer-motion';

import useCartStore from '../store/cartStore';
import { MdShoppingCart, MdSchedule } from 'react-icons/md';
import Link from 'next/link';
import ModeSelector from './menu/ModeSelector';
import ModeToggle from './menu/ModeToggle';
import ActiveOrderBanner from './order/ActiveOrderBanner';
import { DEFAULT_TAKEAWAY_HOURS, isWithinTakeawayHours } from '../utils/constants';

// Obtener hora actual en formato HH:MM (hora local de Argentina)
const getCurrentTimeArgentina = () => {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires'
  });
};

// Verifica si una hora está dentro de un rango (maneja horarios que cruzan medianoche)
const isTimeInRange = (currentTime, openTime, closeTime) => {
  if (closeTime < openTime) {
    // Horario cruza medianoche (ej: 20:00 - 02:00)
    return currentTime >= openTime || currentTime <= closeTime;
  }
  return currentTime >= openTime && currentTime <= closeTime;
};


const MenuDisplay = ({ locationId }) => {
  const router = useRouter();
  const [menuMode, setMenuMode] = useState(null); // 'local' | 'takeaway'
  const [isStoreOpen, setIsStoreOpen] = useState(true); // Default to true to avoid flash

  const { data, loading, error } = useFetch(`${API_URI}/api/menu/${locationId}`)
  const { items: cartItems, getCartCount, getCartTotal } = useCartStore();

  const cartCount = getCartCount(locationId);
  const cartTotal = getCartTotal(locationId);

  const handleModeSelect = useCallback((mode) => {
    setMenuMode(mode);
    localStorage.setItem(`menuMode_${locationId}`, mode);
  }, [locationId]);

  const handleChangeMode = () => {
    localStorage.removeItem(`menuMode_${locationId}`);
    setMenuMode(null);
  };

  // Handler directo para el toggle sin pasar por el modal
  const handleToggleMode = useCallback((newMode) => {
    setMenuMode(newMode);
    localStorage.setItem(`menuMode_${locationId}`, newMode);
  }, [locationId]);

  // Calcular horas de takeaway
  const globalHours = data?.takeawayHours || DEFAULT_TAKEAWAY_HOURS;

  // Calcular hora solo en el cliente para evitar hydration mismatch
  useEffect(() => {
    const checkStoreHours = () => {
      const now = getCurrentTimeArgentina();
      setIsStoreOpen(isTimeInRange(now, globalHours.open, globalHours.close));
    };
    checkStoreHours();
    // Actualizar cada minuto
    const interval = setInterval(checkStoreHours, 60000);
    return () => clearInterval(interval);
  }, [globalHours.open, globalHours.close]);

  const isTakeaway = menuMode === 'takeaway';

  // location3 es solo para mostrar el menú, sin funcionalidad de compra
  const isDisplayOnly = locationId === 'location3';

  // Renderizar ModeSelector siempre para que pueda setear el modo
  // Sin esto, el componente se queda en loading infinito
  if (loading) return (
    <>
      <ModeSelector locationId={locationId} onModeSelect={handleModeSelect} takeawayHours={globalHours} isDisplayOnly={isDisplayOnly} />
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    </>
  );

  // Esperar a que se seleccione el modo (el ModeSelector ya está montado arriba o en el return principal)
  if (!menuMode) return (
    <>
      <ModeSelector locationId={locationId} onModeSelect={handleModeSelect} takeawayHours={globalHours} isDisplayOnly={isDisplayOnly} />
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    </>
  );

  if (error) return <FullScreenError message='404' buttonText='Regresar al inicio' onClick={() => router.push('/')} />;

  // Defensa: verificar que data y categories existan
  const categories = data?.categories || [];

  // Obtener hora actual para filtrar categorías
  const now = typeof window !== 'undefined' ? getCurrentTimeArgentina() : globalHours.open;

  // Filtrar categorías activas y que apliquen a esta sede
  const activeCategories = categories.filter(category => {
    // Debe estar activa
    if (!category.isActive) return false;
    // Si no tiene locations definidas (array vacío), aplica a todas las sedes
    if (category.locations?.length > 0 && !category.locations.includes(locationId)) return false;

    // Filtro por horario solo en modo takeaway y si la tienda está abierta
    if (isTakeaway && isStoreOpen) {
      const catFrom = category.schedule?.availableFrom || globalHours.open;
      const catTo = category.schedule?.availableTo || globalHours.close;
      if (!isTimeInRange(now, catFrom, catTo)) return false;
    }

    return true;
  });

  return (
    <div className='min-h-screen bg-gray-100 relative'>
      {/* Modal selector de modo */}
      <ModeSelector locationId={locationId} onModeSelect={handleModeSelect} takeawayHours={globalHours} isDisplayOnly={isDisplayOnly} />

      {/* Banner de pedido activo */}
      <ActiveOrderBanner />

      {/* Toggle de modo - siempre visible (oculto para displayOnly) */}
      {menuMode && !isDisplayOnly && (
        <div className="fixed top-4 right-4 z-40 bg-white/95 backdrop-blur-sm shadow-lg rounded-full p-1.5 border border-gray-100">
          <ModeToggle
            currentMode={menuMode}
            onModeChange={handleToggleMode}
            isTakeawayAvailable={isStoreOpen}
            takeawayHours={globalHours}
          /></div>
      )}

      {/* Navegación condicional: TakeawayNav para takeaway, CategoryNav para local */}
      {isTakeaway ? (
        <header className="fixed top-0 left-0 right-0 z-50">
          <TakeawayNav categories={activeCategories} />
        </header>
      ) : (
        <header className="fixed top-0 left-0 right-0 z-50">
          <CategoryNav categories={activeCategories} />
        </header>
      )}

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 ${isTakeaway ? 'mt-40 md:mt-44' : 'mt-4'}`}>
        {/* Header con logo y slogan - diferente para takeaway vs local */}
        {isTakeaway ? (
          <motion.div
            className="mb-6 pt-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="text-center text-sm font-medium text-gray-500 italic">
              "Comés como en casa, pero sin lavar los platos!"
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Image className='m-auto' src="/logo.png" alt="logo.png" width={200} height={300} />
            <p className="text-center text-xl mb-8 italic text-menu px-4">
              Bienvenido a nuestro menú digital. Explorá nuestras deliciosas opciones y disfrutá de una experiencia.<br />
              <span className='text-sm font-bold block mt-2 text-gray-500'>"Comés como en casa, pero sin lavar los platos!"</span>
            </p>
          </motion.div>
        )}
        {/* TODO: Promotions comentado temporalmente para takeaway - se le dará más sentido después */}
        {/* {!isTakeaway && <Promotion />} */}
        {isTakeaway && !isStoreOpen && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center my-8">
            <MdSchedule className="mx-auto h-10 w-10 text-red-400 mb-3" />
            <h3 className="text-lg font-bold text-red-700">Takeaway no disponible</h3>
            <p className="text-sm text-red-600 mt-2">
              Nuestro horario de takeaway es de {globalHours.open}hs a {globalHours.close}hs
            </p>
          </div>
        )}
        {(!isTakeaway || isStoreOpen || isDisplayOnly) && activeCategories.map((category) => (
          <CategoryDisplay key={category._id} category={category} locationId={locationId} isTakeaway={isTakeaway || isDisplayOnly} displayOnly={isDisplayOnly} />
        ))}
        <BrandsSection />
        <WeatherWidget />
        <LocationsSection />
        <MainFooter />
      </main>

      {/* Floating Cart Button - Solo en modo Takeaway, dentro de horario y NO displayOnly */}
      {isTakeaway && isStoreOpen && !isDisplayOnly && cartCount > 0 && (
        <Link
          href={`/checkout/${locationId}`}
          className="fixed bottom-[15%] left-1/2 -translate-x-1/2 z-50 bg-orange-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-4 hover:bg-orange-700 transition-all hover:scale-105 active:scale-95 w-[90%] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="relative">
            <MdShoppingCart size={24} />
            <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Ver Pedido</p>
            <p className="text-lg font-black">${cartTotal.toLocaleString()}</p>
          </div>
          <span className="text-xl">→</span>
        </Link>
      )}
    </div>
  );
};



export default MenuDisplay;