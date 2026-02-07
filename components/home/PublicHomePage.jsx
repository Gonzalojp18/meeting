'use client';
import Link from 'next/link';
import HomeCarousel from './HomeCarousel';
import BottomNav from '../navigation/BottomNav';
// import Image from 'next/image';
import { MdStorefront, MdRestaurantMenu, MdLocationOn } from 'react-icons/md';

export default function PublicHomePage() {
    return (
        <div className="h-screen flex flex-col bg-black">
            {/* Carousel - ocupa todo el espacio menos el nav inferior (h-16) */}
            <div className="flex-1 relative min-h-0">
                <HomeCarousel />

                {/* Logo overlay */}
                {/* <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                    <Image
                        src="/logo.png"
                        alt="Meeting Restobar"
                        width={140}
                        height={70}
                        className="drop-shadow-2xl"
                    />
                </div> */}

                {/* Action Buttons - positioned over carousel */}
                <div className="absolute bottom-20 left-0 right-0 px-4 z-20 space-y-3">
                    {/* TakeAway Button - Harrods */}
                    <Link
                        href="/menu/location1"
                        className="flex items-center gap-4 w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl p-4 shadow-xl hover:from-orange-600 hover:to-orange-700 transition-all active:scale-[0.98]"
                    >
                        <div className="bg-white/20 rounded-xl p-3">
                            <MdStorefront className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                            <p className="text-lg font-bold">Takeaway</p>
                            <p className="text-xs text-white/80 flex items-center gap-1">
                                <MdLocationOn className="w-3 h-3" />
                                Disponible en Sede Harrods
                            </p>
                        </div>
                        <span className="text-2xl">→</span>
                    </Link>

                    {/* Menu Button - location3 (sin precios) */}
                    <Link
                        href="/menu/location3"
                        className="flex items-center gap-4 w-full bg-white/95 text-gray-800 rounded-2xl p-4 shadow-xl hover:bg-white transition-all active:scale-[0.98] border border-white/50"
                    >
                        <div className="bg-orange-100 rounded-xl p-3">
                            <MdRestaurantMenu className="w-7 h-7 text-orange-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-lg font-bold">Ver Menú</p>
                            <p className="text-xs text-gray-500">
                                Explora todas nuestras opciones
                            </p>
                        </div>
                        <span className="text-2xl text-gray-400">→</span>
                    </Link>
                </div>
            </div>

            {/* Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
