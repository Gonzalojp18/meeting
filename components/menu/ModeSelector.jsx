'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdRestaurant, MdDeliveryDining } from 'react-icons/md';

const ModeSelector = ({ locationId, onModeSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const onModeSelectRef = useRef(onModeSelect);

    // Mantener la ref actualizada
    useEffect(() => {
        onModeSelectRef.current = onModeSelect;
    });

    useEffect(() => {
        // Verificar si ya hay un modo seleccionado para esta ubicación
        const savedMode = localStorage.getItem(`menuMode_${locationId}`);
        if (savedMode) {
            onModeSelectRef.current(savedMode);
        } else {
            setIsOpen(true);
        }
    }, [locationId]);

    const handleSelectMode = (mode) => {
        localStorage.setItem(`menuMode_${locationId}`, mode);
        onModeSelect(mode);
        setIsOpen(false);
    };

    const handleChangeMode = () => {
        localStorage.removeItem(`menuMode_${locationId}`);
        setIsOpen(true);
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center"
                        >
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                Bienvenido
                            </h2>
                            <p className="text-gray-600 mb-8">
                                ¿Cómo deseas disfrutar tu experiencia?
                            </p>

                            <div className="space-y-4">
                                <button
                                    onClick={() => handleSelectMode('local')}
                                    className="w-full p-6 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-2xl hover:from-gray-800 hover:to-black transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                                >
                                    <div className="flex items-center justify-center gap-4">
                                        <MdRestaurant size={32} />
                                        <div className="text-left">
                                            <p className="font-bold text-lg">Consumo en Local</p>
                                            <p className="text-sm text-gray-300">Ver menú sin pedido</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleSelectMode('takeaway')}
                                    className="w-full p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                                >
                                    <div className="flex items-center justify-center gap-4">
                                        <MdDeliveryDining size={32} />
                                        <div className="text-left">
                                            <p className="font-bold text-lg">Takeaway / Para Llevar</p>
                                            <p className="text-sm text-orange-200">Hacer pedido online</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ModeSelector;
