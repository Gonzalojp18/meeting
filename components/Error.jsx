import React from 'react';

export const FullScreenError = ({ message, buttonText, onButtonClick }) => {
  return (
    <div className="flex items-center justify-center h-screen bg-red-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-lg text-red-800">{message}</p>
        <buttons
          onClick={onButtonClick}
          className="bg-red-600 text-white px-6 py-3 rounded-full font-semibold text-lg hover:bg-red-700 transition duration-300"
        >
          {buttonText}
        </buttons>
      </div>
    </div>
  );
};