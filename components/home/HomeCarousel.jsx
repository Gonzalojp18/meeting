'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

const images = [
    '/home/almuerzo.png',
    '/home/cafe.PNG',
    '/home/jugos.PNG',
    '/home/mmodelo.PNG',
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
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    <Image
                        src={src}
                        alt={`Slide ${index + 1}`}
                        fill
                        className="object-cover object-center"
                        priority={index === 0}
                    />
                </div>
            ))}

            {/* Gradient overlay for better button visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {/* Dots indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {images.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                            ? 'bg-white w-6'
                            : 'bg-white/50 hover:bg-white/75'
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default HomeCarousel;
