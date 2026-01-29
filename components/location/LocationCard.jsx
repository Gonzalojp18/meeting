import React from 'react';
import { motion } from 'framer-motion';

const LocationCard = ({ location }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-md overflow-hidden"
        >
            <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{location.address}</p>
                <a
                    href={location.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center text-sm text-orange-600 hover:text-orange-700"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Ver en Google Maps
                </a>
            </div>
        </motion.div>
    );
};

export default LocationCard;