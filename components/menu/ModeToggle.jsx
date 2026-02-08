'use client';
import { MdRestaurant, MdDeliveryDining } from 'react-icons/md';
import { motion } from 'framer-motion';

const ModeToggle = ({ currentMode, onModeChange, isTakeawayAvailable, takeawayHours }) => {
    const isLocal = currentMode === 'local';

    const handleToggle = () => {
        if (isLocal && !isTakeawayAvailable) {
            // No permitir cambiar a takeaway si está fuera de horario
            return;
        }
        onModeChange(isLocal ? 'takeaway' : 'local');
    };

    return (
        <div className="flex items-center gap-2">
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

            {/* Horario indicator */}
            {!isTakeawayAvailable && (
                <span className="text-[10px] text-gray-400 font-medium hidden sm:block">
                    {takeawayHours?.open}-{takeawayHours?.close}hs
                </span>
            )}
        </div>
    );
};

export default ModeToggle;
