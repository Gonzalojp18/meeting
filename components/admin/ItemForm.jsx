import React, { useState, useEffect } from 'react';
import { MdAdd, MdDelete } from 'react-icons/md';

const ItemForm = ({ item, locations, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locations: {},
    hasCustomizations: false,
    customization: {
      name: 'Guarnición',
      required: false,
      options: []
    }
  });

  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    const existingCustomization = item?.customizations?.[0];

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
        }), {}),
        hasCustomizations: !!existingCustomization,
        customization: existingCustomization
          ? {
              name: existingCustomization.name || 'Guarnición',
              required: existingCustomization.required || false,
              options: existingCustomization.options?.map(o => ({ name: o.name })) || []
            }
          : { name: 'Guarnición', required: false, options: [] }
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
        }), {}),
        hasCustomizations: false,
        customization: {
          name: 'Guarnición',
          required: false,
          options: []
        }
      });
    }
  }, [item, locations]);

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (formData.customization.options.some(o => o.name.toLowerCase() === trimmed.toLowerCase())) return;

    setFormData({
      ...formData,
      customization: {
        ...formData.customization,
        options: [...formData.customization.options, { name: trimmed }]
      }
    });
    setNewOption('');
  };

  const handleRemoveOption = (index) => {
    setFormData({
      ...formData,
      customization: {
        ...formData.customization,
        options: formData.customization.options.filter((_, i) => i !== index)
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const processedData = {
      name: formData.name,
      description: formData.description,
      prices: Object.entries(formData.locations).reduce((acc, [locationId, data]) => ({
        ...acc,
        [locationId]: data.price
      }), {}),
      customizations: formData.hasCustomizations && formData.customization.options.length > 0
        ? [{
            name: formData.customization.name,
            type: 'single',
            required: formData.customization.required,
            options: formData.customization.options.map(o => ({
              name: o.name,
              priceModifier: 0,
              isAvailable: true
            }))
          }]
        : []
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

      {/* Sección de Personalización / Guarniciones */}
      <div className="border-t pt-4">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.hasCustomizations}
            onChange={(e) => setFormData({ ...formData, hasCustomizations: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">
            Este plato tiene opciones (ej: guarnición)
          </span>
        </label>

        {formData.hasCustomizations && (
          <div className="mt-3 space-y-3 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase">Nombre del grupo</label>
              <input
                type="text"
                value={formData.customization.name}
                onChange={(e) => setFormData({
                  ...formData,
                  customization: { ...formData.customization, name: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                placeholder="Guarnición"
              />
            </div>

            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.customization.required}
                onChange={(e) => setFormData({
                  ...formData,
                  customization: { ...formData.customization, required: e.target.checked }
                })}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Obligatorio elegir</span>
            </label>

            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase mb-1">Opciones</label>
              {formData.customization.options.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {formData.customization.options.map((opt, idx) => (
                    <li key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-md border border-gray-200">
                      <span className="text-sm text-gray-800">{opt.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <MdDelete size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
                  className="flex-1 rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                  placeholder="Ej: Puré de papas"
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1 text-sm"
                >
                  <MdAdd size={16} />
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}
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
