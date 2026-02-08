'use client';
import Link from 'next/link';
import HomeCarousel from './HomeCarousel';
import BottomNav from '../navigation/BottomNav';
import { MdStorefront, MdRestaurantMenu } from 'react-icons/md';

export default function PublicHomePage() {
    return (
        <div className="h-screen flex flex-col bg-neutral-100 overflow-hidden">
            {/* Carousel - ocupa todo menos el nav (64px) */}
            <div className="flex-1 relative">
                <HomeCarousel />

                {/* Action Buttons - estilo frosted glass como la referencia */}
                <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
                    <div className="flex gap-3 justify-center">
                        {/* TakeAway Button - Frosted glass style */}
                        <Link
                            href="/menu/location1"
                            className="flex-1 flex items-center justify-center gap-2 bg-orange-500/90 backdrop-blur-md text-white rounded-full py-3 px-6 shadow-lg hover:bg-orange-600/90 transition-all active:scale-[0.97] border border-white/20"
                        >
                            <MdStorefront className="w-5 h-5" />
                            <span className="text-sm font-semibold tracking-wide uppercase">Takeaway</span>
                        </Link>

                        {/* Menu Button - Frosted glass light style */}
                        <Link
                            href="/menu/location3"
                            className="flex-1 flex items-center justify-center gap-2 bg-white/70 backdrop-blur-md text-gray-700 rounded-full py-3 px-6 shadow-lg hover:bg-white/90 transition-all active:scale-[0.97] border border-white/50"
                        >
                            <MdRestaurantMenu className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-semibold tracking-wide uppercase">Ver Menú</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
