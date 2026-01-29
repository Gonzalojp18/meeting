import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const LocationNav = ({ adminView = false, locations }) => {
  const router = useRouter()
  const [location, setLocation] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationSelect = (locationId) => {
    setLocation(locationId);

    setIsOpen(false);

    router.push(`/menu/${locationId}`);
  };

  const selectedLocation = locations?.find((loc) => loc.nameId === location)?.name

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
      >
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          {selectedLocation || 'Select Location'}
        </div>
        <svg className="ml-2 -mr-1 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
              {adminView ? 'Select active menu to display' : 'Select your location'}
            </div>
            {locations.map((location) => (
              <button
                key={location._id}
                onClick={() => handleLocationSelect(location.nameId)}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 ${
                  selectedLocation === location.name ? 'bg-orange-50 text-orange-700' : 'text-gray-700'
                }`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedLocation === location.name ? 'bg-orange-100' : 'bg-gray-100'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${
                    selectedLocation === location.name ? 'text-orange-600' : 'text-gray-500'
                  }`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{location.name}</div>
                  <div className="text-sm text-gray-500">
                    {adminView ? 'Set as active menu' : 'View menu for this location'}
                  </div>
                </div>
                {selectedLocation === location.name && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationNav;