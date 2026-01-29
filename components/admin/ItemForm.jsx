import React, { useState, useEffect } from 'react';

const ItemForm = ({ item, locations, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locations: {}
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        locations: locations.reduce((acc, loc) => ({
          ...acc,
          [loc.nameId]: {
            enabled: item.prices?.[loc.nameId] !== undefined,
            price: item.prices?.[loc.nameId] || ''
          }
        }), {})
      });
    } else {
      setFormData({
        name: '',
        description: '',
        locations: locations.reduce((acc, loc) => ({
          ...acc,
          [loc.nameId]: {
            enabled: true,
            price: ''
          }
        }), {})
      });
    }
  }, [item, locations]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const processedData = {
      name: formData.name,
      description: formData.description,
      prices: Object.entries(formData.locations).reduce((acc, [locationId, data]) => ({
        ...acc,
        [locationId]: data.price
      }), {})
    };

    onSubmit(processedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nombre Producto</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
          rows={3}
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Disponibilidad y precios</label>
        {locations.map(location => (
          <React.Fragment key={location._id}>
            {location.nameId === 'location3' ? null :
              <div className="flex items-center space-x-4 bg-gray-50 p-3 rounded-lg">
                <label className="inline-flex items-center min-w-[150px]">
                  <input
                    type="checkbox"
                    checked={formData.locations[location.nameId]?.enabled ?? true}
                    onChange={(e) => setFormData({
                      ...formData,
                      locations: {
                        ...formData.locations,
                        [location.nameId]: {
                          ...formData.locations[location.nameId],
                          enabled: e.target.checked,
                          price: e.target.checked ? formData.locations[location.nameId]?.price || '' : ''
                        }
                      }
                    })}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">{location.name}</span>
                </label>
                {formData.locations[location.nameId]?.enabled && (
                  <div className="flex-1">
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.locations[location.nameId]?.price ?? ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          locations: {
                            ...formData.locations,
                            [location.nameId]: {
                              ...formData.locations[location.nameId],
                              price: e.target.value
                            }
                          }
                        })}
                        className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="0.00"
                        required={formData.locations[location.nameId]?.enabled}
                      />
                    </div>
                  </div>
                )}
              </div>}
          </React.Fragment>
        ))}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {item ? 'Actualizar' : 'Agregar'}
        </button>
      </div>
    </form>
  );
};

export default ItemForm;