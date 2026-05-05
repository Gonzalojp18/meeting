'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose, MdPercent, MdArrowForward, MdCheckCircle } from 'react-icons/md';
import API_URI from '@/utils/getApiUri';

export default function QrPromoBanner({ locationId, source }) {
  const [show, setShow] = useState(false);
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPromo();
  }, [locationId, source]);

  const checkPromo = async () => {
    if (!source || !source.toLowerCase().includes('qr')) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URI}/api/qr-promo/${locationId}?source=${source}`);
      const data = await res.json();

      if (data.show && data.promo) {
        setPromo(data.promo);
        setShow(true);
        if (data.promo.type === 'discount') {
          sessionStorage.setItem('active-qr-promo', JSON.stringify({
            discountPercentage: data.promo.discountPercentage,
            locationId,
          }));
        }
      }
    } catch (e) {
      console.error('Error checking promo:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    setShow(false);
    try {
      await fetch(`${API_URI}/api/qr-promo/${locationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, discountPercentage: promo?.discountPercentage || 0 }),
      });
    } catch (e) {
      console.error('Error recording view:', e);
    }
  };

  if (loading || !show || !promo) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <MdClose size={20} />
            </button>

            {promo.type === 'discount' && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-full font-bold">
                  <MdPercent size={16} />
                  {promo.discountPercentage}% OFF
                </div>
              </div>
            )}

            {promo.type === 'loyalty' && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-full font-bold">
                  <MdCheckCircle size={16} />
                  Club Exclusivo
                </div>
              </div>
            )}

            {promo.type === 'info' && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full">
                  <MdPercent size={24} className="text-blue-600" />
                </div>
              </div>
            )}

            <h2 className="text-2xl font-bold text-center mb-2">{promo.title}</h2>
            <p className="text-gray-600 text-center mb-6">
              {promo.type === 'discount'
                ? promo.subtitle.replace('{discount}', `${promo.discountPercentage}%`)
                : promo.subtitle}
            </p>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
            >
              {promo.buttonText}
              <MdArrowForward size={20} />
            </button>

            <p className="text-xs text-gray-400 text-center mt-4">{promo.termsText}</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
