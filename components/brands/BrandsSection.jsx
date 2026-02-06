import React from 'react';
import Image from 'next/image';

const BrandsSection = () => {
  const brands = [
    { id: 1, name: 'Pepsi', imageUrl: '/assets/marcas/pepsi.webp' },
    { id: 2, name: '7UP', imageUrl: '/assets/marcas/7up.webp' },
    { id: 3, name: 'Gatorade', imageUrl: '/assets/marcas/gatorade.webp' },
    { id: 4, name: 'Paso de los Toros', imageUrl: '/assets/marcas/toros.webp' },
    { id: 5, name: 'Stella Artois', imageUrl: '/assets/marcas/stella.webp' },
    { id: 6, name: 'Corona', imageUrl: '/assets/marcas/corona.webp' },
  ];

  return (
    <section className="py-8 border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4">
        <p className="text-center text-xs text-gray-400 mb-4 uppercase tracking-wider">
          Trabajamos con
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="relative w-16 h-12 md:w-20 md:h-14 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={brand.imageUrl}
                alt={brand.name}
                fill
                className="object-contain"
                sizes="80px"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsSection;
