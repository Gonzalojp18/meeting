'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { useFetch } from '../hooks/useFetch';
import CategoryDisplay from './categories/CategoryDisplay';
import { CategoryNav } from './navigation';
import BrandsSection from './brands/BrandsSection';
import Image from 'next/image';

import Promotion from './promo/Promotions'
import { FullScreenError } from './Error'
import { MainFooter } from './footer';
import { LocationsSection } from './location';
import { useRouter } from 'next/navigation';
import API_URI from '../utils/getApiUri'
import WeatherWidget from './Weather/WeatherWidget'
import { motion } from 'framer-motion';

import useCartStore from '../store/cartStore';
import { MdShoppingCart, MdSwapHoriz } from 'react-icons/md';
import Link from 'next/link';
import ModeSelector from './menu/ModeSelector';

const MenuDisplay = ({ locationId }) => {
  const router = useRouter();
  const [menuMode, setMenuMode] = useState(null); // 'local' | 'takeaway'

  const { data, loading, error } = useFetch(`${API_URI}/api/menu/${locationId}`)
  const { items: cartItems, getCartCount, getCartTotal } = useCartStore();

  const cartCount = getCartCount(locationId);
  const cartTotal = getCartTotal(locationId);

  const handleModeSelect = useCallback((mode) => {
    setMenuMode(mode);
  }, []);

  const handleChangeMode = () => {
    localStorage.removeItem(`menuMode_${locationId}`);
    setMenuMode(null);
  };

  const isTakeaway = menuMode === 'takeaway';

  if (loading) return <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
  </div>;

  if (error) return <FullScreenError message='404' buttonText='Regresar al inicio' onButtonClick={() => router.push('/')} />;

  return (
    <div className='min-h-screen bg-gray-100 relative'>
      {/* Modal selector de modo */}
      <ModeSelector locationId={locationId} onModeSelect={handleModeSelect} />

      {/* Indicador de modo actual */}
      {menuMode && (
        <button
          onClick={handleChangeMode}
          className="fixed top-20 right-4 z-40 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border"
        >
          <MdSwapHoriz size={18} />
          {menuMode === 'local' ? 'Consumo Local' : 'Takeaway'}
        </button>
      )}

      <header className="fixed top-0 left-0 right-0 z-50">
        <CategoryNav categories={data.categories} />
      </header>

      <main className="mt-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 main-container-menu pb-32">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Image className='m-auto' src="/assets/miselaneous/logosinbg.webp" alt="logo" width={200} height={100} />
          <p className="text-center text-xl mb-8 italic text-menu px-4">
            Bienvenido a nuestro menú digital. Explorá nuestras deliciosas opciones y disfrutá de una experiencia.<br />
            <span className="text-orange-600 font-bold block mt-2">Sede: {locationId}</span>
            <span className='text-sm font-bold block mt-2 text-gray-500'>"Comés como en casa, pero sin lavar los platos!"</span>
          </p>
        </motion.div>
        <Promotion />
        {data.categories.map((category) => (
          <CategoryDisplay key={category._id} category={category} locationId={locationId} isTakeaway={isTakeaway} />
        ))}
        <BrandsSection />
        <WeatherWidget />
        <LocationsSection />
        <MainFooter />
      </main>

      {/* Floating Cart Button - Solo en modo Takeaway */}
      {isTakeaway && cartCount > 0 && (
        <Link
          href={`/checkout/${locationId}`}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-orange-600 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 hover:bg-orange-700 transition-all hover:scale-105 active:scale-95 w-[90%] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
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