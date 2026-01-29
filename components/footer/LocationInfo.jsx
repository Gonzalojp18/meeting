import React from 'react';

const LocationInfo = ({ location }) => {
  return (
    <div className="flex items-start space-x-2">
      <div className="flex-shrink-0 mt-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <h4 className="font-medium text-gray-900">{location.name}</h4>
        <p className="text-gray-600">{location.address}</p>
      </div>
    </div>
  );
};

export default LocationInfo;