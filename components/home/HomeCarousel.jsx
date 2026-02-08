'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

const images = [
    '/home/mmodelo.PNG',
    '/home/almuerzo.png',
    '/home/cafe.PNG',
    '/home/jugos.PNG',
    '/home/sald.PNG',
    '/home/sand.PNG',
    '/home/wrap.PNG',
];

const HomeCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    }, []);

    useEffect(() => {
        const interval = setInterval(nextSlide, 4000);
        return () => clearInterval(interval);
    }, [nextSlide]);

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
            {images.map((src, index) => (
                <div
                    key={src}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    <Image
                        src={src}
                        alt={`Slide ${index + 1}`}
                        fill
                        sizes="100vw"
                        quality={90}
                        className="object-cover"
                        priority={index === 0}
                    />
                    {/* Overlay de sombra desde arriba */}
                    <div
                        className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-transparent pointer-events-none"
                    />
                </div>


            ))}

            {/* Soft overlay - efecto suave como en la referencia */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/50 pointer-events-none" />

            {/* Vignette effect */}
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.3)] pointer-events-none" />
        </div>
    );
};

export default HomeCarousel;
