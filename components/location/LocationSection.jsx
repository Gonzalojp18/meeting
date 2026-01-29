import React from 'react';
import LocationCard from './LocationCard';

const locations = [
    {
        id: 1,
        name: 'Club Obra Sanitaria',
        address: 'Av Libertador 7281',
        // mapImage: '/images/maps/obra-sanitaria.jpg',
        mapsUrl: 'https://maps.google.com/?q=Av+Libertador+7281'
    },
    {
        id: 2,
        name: 'Club Obra Sanitaria Anexo',
        address: 'Av Figueroa Alcorta 7250',
        // mapImage: '/images/maps/obra-sanitaria-anexo.jpg',
        mapsUrl: 'https://maps.google.com/?q=Av+Figueroa+Alcorta+7250'
    },
    {
        id: 3,
        name: 'Club Harrods Gath&Chaves',
        address: 'Virrey de Pino 1480',
        // mapImage: '/images/maps/harrods.jpg',
        mapsUrl: 'https://maps.google.com/?q=Virrey+de+Pino+1480'
    }
];

const LocationsSection = () => {
    return (
        <section className="bg-gray-50 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
                    Nuestras Ubicaciones
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {locations.map(location => (
                        <LocationCard key={location.id} location={location} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default LocationsSection;