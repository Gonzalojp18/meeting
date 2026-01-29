import React from 'react';
import { useDailyPromotion } from './useDailyPromotion';
import { motion } from 'framer-motion';

const Promotions = () => {
    const { isWeekday, promotion, styles } = useDailyPromotion();

    if (!isWeekday || !promotion) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-12"
        >
            <div className={`rounded-2xl shadow-2xl overflow-hidden ${styles.background} ${styles.border}`}>
                <div className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        {/* Content */}
                        <div className="flex-1 text-center md:text-left">
                            {/* Badge */}
                            <div className="mb-6 inline-flex items-center px-5 py-2 rounded-full border-2 border-current backdrop-blur-sm bg-white/10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className={`text-sm font-bold tracking-wider uppercase ${styles.textColor}`}>
                                    Opciones para todos tus días
                                </span>
                            </div>

                            {/* Title */}
                            <h3 className={`text-3xl md:text-4xl font-black mb-4 ${styles.accentColor} leading-tight`}>
                                {promotion.title}
                            </h3>

                            {/* Description */}
                            <p className={`text-base md:text-lg mb-8 ${styles.textColor} opacity-90 leading-relaxed`}>
                                {promotion.description}
                            </p>

                            {/* CTA */}
                            <div className="flex flex-col items-center md:items-start gap-4">
                                <button
                                    className={`${styles.buttonClass} px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-lg`}
                                >
                                    Consulta a tu camarero por el plato del día
                                </button>
                                <p className="text-xs text-gray-500 font-semibold">
                                    *** Válido solo de lunes a viernes de 12:00 a 16:00 ***
                                </p>
                            </div>
                        </div>

                        {/* Icon */}
                        <div className="hidden md:flex items-center justify-center">
                            <div className={`${styles.iconBackground} w-32 h-32 rounded-2xl flex items-center justify-center text-7xl shadow-xl transform hover:rotate-6 transition-transform duration-300`}>
                                {promotion.icon}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Promotions;