'use client'
import React, { useState, useEffect } from 'react';
import { MdAdd, MdDelete, MdCloudUpload } from 'react-icons/md';
import { useSession } from 'next-auth/react';

const ItemForm = ({ item, locations, onSubmit, onCancel }) => {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locations: {},
    isAvailable: true,
    hasCustomizations: false,
    image: '',
    customization: {
      name: 'Guarnición',
      required: false,
      options: []
    }
  });

  const [newOption, setNewOption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const existingCustomization = item?.customizations?.[0];

    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        isAvailable: item.isAvailable !== false,
        image: item.image || '',
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
              options: existingCustomization.options?.map(o => ({ name: o.name, isAvailable: o.isAvailable !== false })) || []
            }
          : { name: 'Guarnición', required: false, options: [] }
      });
      if (item.image) {
        setPreviewUrl(item.image);
      }
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
        isAvailable: true,
        hasCustomizations: false,
        image: '',
        customization: {
          name: 'Guarnición',
          required: false,
          options: []
        }
      });
      setPreviewUrl('');
    }
  }, [item, locations]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadToCloudinary = async () => {
    if (!imageFile) {
      alert('Por favor seleccioná una imagen primero');
      return;
    }

    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', imageFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          image: data.url
        }));
        setPreviewUrl(data.url);
        setImageFile(null);
        alert('Imagen subida exitosamente');
      } else {
        alert('Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: ''
    }));
    setPreviewUrl('');
    setImageFile(null);
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (formData.customization.options.some(o => o.name.toLowerCase() === trimmed.toLowerCase())) return;

    setFormData({
      ...formData,
      customization: {
        ...formData.customization,
        options: [...formData.customization.options, { name: trimmed, isAvailable: true }]
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
      isAvailable: formData.isAvailable,
      image: formData.image,
      prices: Object.entries(formData.locations).reduce((acc, [locationId, data]) => {
        if (data.enabled && data.price !== '' && data.price !== undefined && data.price !== null) {
          return { ...acc, [locationId]: parseFloat(data.price) };
        }
        return acc;
      }, {}),
      customizations: formData.hasCustomizations && formData.customization.options.length > 0
        ? [{
            name: formData.customization.name,
            type: 'single',
            required: formData.customization.required,
            options: formData.customization.options.map(o => ({
              name: o.name,
              priceModifier: 0,
              isAvailable: o.isAvailable !== false
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

      {/* Sección de imagen del producto */}
      <div className="border-t pt-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Imagen del producto (opcional - para takeaway)</h4>

        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50 w-fit">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-40 h-40 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 transition-colors shadow-lg"
                title="Eliminar imagen"
              >
                <MdDelete size={16} />
              </button>
            </div>

            {imageFile && (
              <button
                type="button"
                onClick={handleUploadToCloudinary}
                disabled={uploading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {uploading ? 'Subiendo...' : 'Confirmar imagen'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                  <MdCloudUpload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    Click para seleccionar imagen
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, WEBP (MAX. 5MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {imageFile && (
              <button
                type="button"
                onClick={handleUploadToCloudinary}
                disabled={uploading}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {uploading ? 'Subiendo...' : 'Subir a Cloudinary'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toggle de disponibilidad del plato */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${formData.isAvailable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div>
          <span className="text-sm font-medium text-gray-700">Disponible para takeaway</span>
          <p className="text-xs text-gray-500">{formData.isAvailable ? 'Los clientes pueden pedir este plato' : 'Este plato no aparecerá como disponible'}</p>
        </div>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
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
                    <li key={idx} className={`flex items-center justify-between px-3 py-2 rounded-md border ${opt.isAvailable !== false ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}`}>
                      <span className={`text-sm ${opt.isAvailable !== false ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{opt.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = [...formData.customization.options];
                            newOptions[idx] = { ...newOptions[idx], isAvailable: !newOptions[idx].isAvailable };
                            setFormData({
                              ...formData,
                              customization: { ...formData.customization, options: newOptions }
                            });
                          }}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${opt.isAvailable !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                          title={opt.isAvailable !== false ? 'Disponible' : 'No disponible'}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${opt.isAvailable !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <MdDelete size={18} />
                        </button>
                      </div>
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
