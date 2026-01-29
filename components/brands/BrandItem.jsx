import React from 'react';
import Image from 'next/image';

const BrandItem = ({ brand }) => {
  return (
    <div className="group relative flex items-center justify-center p-4 transition-transform duration-300 hover:scale-105">
      <div className="relative w-full aspect-[3/2] overflow-hidden rounded-lg bg-white shadow-md brand">
        <Image
          src={brand.imageUrl}
          alt={brand.name}
          className="h-full w-full object-contain p-4 transition-opacity duration-300 group-hover:opacity-90"
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-all duration-300 group-hover:bg-opacity-10">
          <span className="text-transparent group-hover:text-white">{brand.name}</span>
        </div>
      </div>
    </div>
  );
};

export default BrandItem;