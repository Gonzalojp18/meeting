'use client';
import { useState } from 'react';
import { MdRestaurant, MdDeliveryDining, MdSchedule } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';

const ModeToggle = ({ currentMode, onModeChange, isTakeawayAvailable, takeawayHours, locationFeatures = { takeawayEnabled: true, localEnabled: true }, isDisplayOnly = false }) => {
    const isLocal = currentMode === 'local';
    const [showUnavailableToast, setShowUnavailableToast] = useState(false);
    const [showDisplayOnlyToast, setShowDisplayOnlyToast] = useState(false);

    const handleToggle = () => {
        // Si es display only (location3), mostrar toast y no permitir cambio
        if (isDisplayOnly) {
            setShowDisplayOnlyToast(true);
            setTimeout(() => setShowDisplayOnlyToast(false), 2500);
            return;
        }

        if (isLocal && !isTakeawayAvailable) {
            setShowUnavailableToast(true);
            setTimeout(() => setShowUnavailableToast(false), 3000);
            return;
        }
        if (!isLocal && !(locationFeatures?.localEnabled ?? true)) {
            setShowUnavailableToast(true);
            setTimeout(() => setShowUnavailableToast(false), 3000);
            return;
        }
        onModeChange(isLocal ? 'takeaway' : 'local');
    };

    return (
        <div className="relative flex items-center gap-2">
            {/* Toggle Container */}
            <button
                onClick={handleToggle}
                className="relative flex items-center bg-gray-100 rounded-full p-1 shadow-inner"
                aria-label="Cambiar modo de pedido"
            >
                {/* Background slider */}
                <motion.div
                    className={`absolute h-8 rounded-full ${isLocal ? 'w-24' : 'w-[88px]'} ${isLocal
                        ? 'bg-gray-800'
                        : isTakeawayAvailable
                            ? 'bg-orange-500'
                            : 'bg-gray-400'
                        }`}
                    initial={false}
                    animate={{
                        x: isLocal ? 0 : 96
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />

                {/* Local option */}
                <div
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors w-24 justify-center ${isLocal ? 'text-white' : 'text-gray-500'
                        }`}
                >
                    <MdRestaurant className="w-4 h-4" />
                    <span className="text-xs font-semibold">Local</span>
                </div>

                {/* Takeaway option */}
                <div
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors w-[88px] justify-center ${!isLocal ? 'text-white' : 'text-gray-500'
                        } ${!isTakeawayAvailable && isLocal ? 'opacity-50' : ''}`}
                >
                    <MdDeliveryDining className="w-4 h-4" />
                    <span className="text-xs font-semibold">Llevar</span>
                </div>
            </button>

            {/* Toast de horario no disponible */}
            <AnimatePresence>
                {showUnavailableToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        className="absolute top-full mt-3 right-0 bg-gray-900 text-white rounded-xl px-4 py-3 shadow-xl min-w-[200px] z-50"
                    >
                        <div className="flex items-center gap-2">
                            <MdSchedule className="w-5 h-5 text-orange-400 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold">
                                    {locationFeatures?.localEnabled === false ? 'Menú local no disponible'
                                        : locationFeatures?.takeawayEnabled === false ? 'Takeaway no disponible'
                                        : 'Takeaway cerrado'}
                                </p>
                                <p className="text-xs text-gray-300">
                                    {locationFeatures?.localEnabled === false ? 'No disponible en esta sede'
                                        : locationFeatures?.takeawayEnabled === false ? 'No disponible en esta sede'
                                        : `Horario: ${takeawayHours?.open}hs - ${takeawayHours?.close}hs`}
                                </p>
                            </div>
                        </div>
                        {/* Arrow/Triangle pointing up */}
                        <div className="absolute -top-2 right-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-900" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast de modo solo lectura (display-only) */}
            <AnimatePresence>
                {showDisplayOnlyToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        className="absolute top-full mt-3 right-0 bg-blue-900 text-white rounded-xl px-4 py-3 shadow-xl min-w-[200px] z-50"
                    >
                        <div className="flex items-center gap-2">
                            <MdRestaurant className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold">Menú de consulta</p>
                                <p className="text-xs text-blue-200">
                                    Este menú es solo para visualización
                                </p>
                            </div>
                        </div>
                        {/* Arrow/Triangle pointing up */}
                        <div className="absolute -top-2 right-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-blue-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ModeToggle;
