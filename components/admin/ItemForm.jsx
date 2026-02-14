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
    customizationGroups: []
  });

  const [newOptions, setNewOptions] = useState({});
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const existingGroups = item?.customizations || [];

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
        hasCustomizations: existingGroups.length > 0,
        customizationGroups: existingGroups.map(g => ({
          name: g.name || 'Guarnición',
          type: g.type || 'single',
          required: g.required || false,
          minSelections: g.minSelections || 1,
          maxSelections: g.maxSelections || 1,
          options: g.options?.map(o => ({ name: o.name, isAvailable: o.isAvailable !== false })) || []
        }))
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
        customizationGroups: []
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

  const handleAddGroup = () => {
    setFormData(prev => ({
      ...prev,
      customizationGroups: [
        ...prev.customizationGroups,
        { name: '', type: 'single', required: false, minSelections: 1, maxSelections: 1, options: [] }
      ]
    }));
  };

  const handleRemoveGroup = (groupIndex) => {
    setFormData(prev => {
      const newGroups = prev.customizationGroups.filter((_, i) => i !== groupIndex);
      return { ...prev, customizationGroups: newGroups, hasCustomizations: newGroups.length > 0 };
    });
  };

  const updateGroup = (groupIndex, updates) => {
    setFormData(prev => ({
      ...prev,
      customizationGroups: prev.customizationGroups.map((g, i) =>
        i === groupIndex ? { ...g, ...updates } : g
      )
    }));
  };

  const handleTypeChange = (groupIndex, newType) => {
    const updates = { type: newType };
    if (newType === 'single') {
      updates.minSelections = 1;
      updates.maxSelections = 1;
    } else {
      updates.minSelections = 1;
      updates.maxSelections = 2;
    }
    updateGroup(groupIndex, updates);
  };

  const handleAddOptionToGroup = (groupIndex) => {
    const trimmed = (newOptions[groupIndex] || '').trim();
    if (!trimmed) return;
    const group = formData.customizationGroups[groupIndex];
    if (group.options.some(o => o.name.toLowerCase() === trimmed.toLowerCase())) return;
    updateGroup(groupIndex, { options: [...group.options, { name: trimmed, isAvailable: true }] });
    setNewOptions(prev => ({ ...prev, [groupIndex]: '' }));
  };

  const handleRemoveOptionFromGroup = (groupIndex, optionIndex) => {
    const group = formData.customizationGroups[groupIndex];
    updateGroup(groupIndex, { options: group.options.filter((_, i) => i !== optionIndex) });
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
      customizations: formData.hasCustomizations
        ? formData.customizationGroups
            .filter(g => g.name.trim() && g.options.length > 0)
            .map(g => ({
              name: g.name,
              type: g.type,
              required: g.required,
              minSelections: g.type === 'multiple' ? g.minSelections : 1,
              maxSelections: g.type === 'multiple' ? g.maxSelections : 1,
              options: g.options.map(o => ({
                name: o.name,
                priceModifier: 0,
                isAvailable: o.isAvailable !== false
              }))
            }))
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
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked && formData.customizationGroups.length === 0) {
                setFormData({ ...formData, hasCustomizations: true, customizationGroups: [{ name: '', type: 'single', required: false, minSelections: 1, maxSelections: 1, options: [] }] });
              } else {
                setFormData({ ...formData, hasCustomizations: checked });
              }
            }}
            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">
            Este plato tiene opciones personalizables
          </span>
        </label>

        {formData.hasCustomizations && (
          <div className="mt-3 space-y-4">
            {formData.customizationGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 relative">
                {/* Eliminar grupo */}
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(groupIdx)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors"
                  title="Eliminar grupo"
                >
                  <MdDelete size={18} />
                </button>

                {/* Nombre del grupo */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase">Nombre del grupo</label>
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => updateGroup(groupIdx, { name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                    placeholder="Ej: Guarnición, Proteína, Salsa"
                  />
                </div>

                {/* Tipo: single o multiple */}
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleTypeChange(groupIdx, 'single')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${group.type === 'single' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Elegir 1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange(groupIdx, 'multiple')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${group.type === 'multiple' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Elegir varios
                  </button>
                </div>

                {/* Min/Max para multiple */}
                {group.type === 'multiple' && (
                  <div className="flex gap-4 mt-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600">Min</label>
                      <input
                        type="number"
                        min={0}
                        max={group.options.length || 10}
                        value={group.minSelections}
                        onChange={(e) => updateGroup(groupIdx, { minSelections: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600">Max</label>
                      <input
                        type="number"
                        min={1}
                        max={group.options.length || 10}
                        value={group.maxSelections}
                        onChange={(e) => updateGroup(groupIdx, { maxSelections: parseInt(e.target.value) || 1 })}
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                      />
                    </div>
                  </div>
                )}

                {/* Obligatorio */}
                <label className="inline-flex items-center cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={group.required}
                    onChange={(e) => updateGroup(groupIdx, { required: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Obligatorio elegir</span>
                </label>

                {/* Opciones */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 uppercase mb-1">Opciones</label>
                  {group.options.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {group.options.map((opt, optIdx) => (
                        <li key={optIdx} className={`flex items-center justify-between px-3 py-2 rounded-md border ${opt.isAvailable !== false ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}`}>
                          <span className={`text-sm ${opt.isAvailable !== false ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{opt.name}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newOpts = [...group.options];
                                newOpts[optIdx] = { ...newOpts[optIdx], isAvailable: !newOpts[optIdx].isAvailable };
                                updateGroup(groupIdx, { options: newOpts });
                              }}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${opt.isAvailable !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                              title={opt.isAvailable !== false ? 'Disponible' : 'No disponible'}
                            >
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${opt.isAvailable !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveOptionFromGroup(groupIdx, optIdx)}
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
                      value={newOptions[groupIdx] || ''}
                      onChange={(e) => setNewOptions(prev => ({ ...prev, [groupIdx]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOptionToGroup(groupIdx); } }}
                      className="flex-1 rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                      placeholder="Ej: Puré de papas"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddOptionToGroup(groupIdx)}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1 text-sm"
                    >
                      <MdAdd size={16} />
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Agregar otro grupo */}
            <button
              type="button"
              onClick={handleAddGroup}
              className="w-full py-2.5 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-medium"
            >
              + Agregar otro grupo de opciones
            </button>
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
