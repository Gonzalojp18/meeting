import React from 'react';
import BrandItem from './BrandItem';

const BrandsSection = () => {
  const brands = [
    {
      id: 1,
      name: 'Pepsi',
      imageUrl: '/assets/marcas/pepsi.webp'
    },
    {
      id: 2,
      name: '7UP',
      imageUrl: '/assets/marcas/7up.webp'
    },
    {
      id: 3,
      name: 'Gatorade',
      imageUrl: '/assets/marcas/gatorade.webp'
    },
    {
      id: 4,
      name: 'Paso de los Toros',
      imageUrl: '/assets/marcas/toros.webp'
    },
    {
      id: 5,
      name: 'Stella Artois',
      imageUrl: '/assets/marcas/stella.webp'
    },
    {
      id: 6,
      name: 'Corona',
      imageUrl: '/assets/marcas/corona.webp'
    },
  ];

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Nuestras Marcas
          </h2>
          <p className="mt-3 text-xl text-gray-500 sm:mt-4">
            Trabajamos con las mejores marcas para ofrecerte calidad premium
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {brands.map((brand) => (
            <BrandItem key={brand.id} brand={brand} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            * Todas las marcas mostradas son propiedad de sus respectivos dueños
          </p>
        </div>
      </div>
    </section>
  );
};

export default BrandsSection;