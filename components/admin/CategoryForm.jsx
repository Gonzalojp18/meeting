'use client'
import React, { useState, useEffect } from 'react';
import { MdCloudUpload, MdDelete } from 'react-icons/md';
import { useSession } from 'next-auth/react';

const CategoryForm = ({ category, locations = [], onSubmit, onCancel }) => {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const [formData, setFormData] = useState({
    name: '',
    subtitle: '',
    style: 'default',
    printRole: 'kitchen',
    image: {
      url: '',
      position: 'top',
      alt: ''
    },
    locations: [] // vacío = todas las sedes
  });

  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        subtitle: category.subtitle || '',
        subtitle: category.subtitle || '',
        style: category.style || 'default',
        printRole: category.printRole || 'kitchen',
        image: {
          url: category.image?.url || '',
          position: category.image?.position || 'top',
          alt: category.image?.alt || ''
        },
        locations: category.locations || []
      });
      if (category.image?.url) {
        setPreviewUrl(category.image.url);
      }
    }
  }, [category]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Crear preview local
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
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          image: {
            ...prev.image,
            url: data.url,
            alt: prev.name || 'Imagen de categoría'
          }
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
      image: {
        url: '',
        position: 'top',
        alt: ''
      }
    }));
    setPreviewUrl('');
    setImageFile(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nombre de la Categoría *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
          placeholder="Ej: Entradas, Platos Principales, Postres"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Subtítulo (opcional)
        </label>
        <input
          type="text"
          value={formData.subtitle}
          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
          placeholder="Ej: Para comenzar tu experiencia"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Estilo de visualización
        </label>
        <select
          value={formData.style}
          onChange={(e) => setFormData({ ...formData, style: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
        >
          <option value="default">Default</option>
          <option value="compact">Compacto</option>
          <option value="featured">Destacado</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Rol de Impresión (Comandas)
        </label>
        <select
          value={formData.printRole}
          onChange={(e) => setFormData({ ...formData, printRole: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
        >
          <option value="kitchen">Cocina (Comida)</option>
          <option value="bar">Barra (Bebidas/Cafetería)</option>
          <option value="both">Ambas</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Determina a qué impresora se enviarán los productos de esta categoría.
        </p>
      </div>

      {/* Selector de sedes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sedes donde mostrar esta categoría
        </label>
        <div className="space-y-2">
          {/* Opción: Todas las sedes */}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="locationMode"
              checked={formData.locations.length === 0}
              onChange={() => setFormData({ ...formData, locations: [] })}
              className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 font-medium">Todas las sedes</span>
          </label>

          {/* Opción: Sedes específicas */}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="locationMode"
              checked={formData.locations.length > 0}
              onChange={() => {
                // Al seleccionar "Sedes específicas", marcar la primera sede por defecto
                if (locations.length > 0) {
                  setFormData({ ...formData, locations: [locations[0].nameId] });
                }
              }}
              className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 font-medium">Sedes específicas</span>
          </label>

          {/* Checkboxes de sedes (solo visibles si eligió "Sedes específicas") */}
          {formData.locations.length > 0 && (
            <div className="ml-6 mt-2 space-y-2 p-3 bg-gray-50 rounded-lg border">
              {locations.map((location) => (
                <label key={location._id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.locations.includes(location.nameId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          locations: [...formData.locations, location.nameId]
                        });
                      } else {
                        // No permitir deseleccionar todas (mínimo 1)
                        const newLocations = formData.locations.filter(l => l !== location.nameId);
                        if (newLocations.length > 0) {
                          setFormData({ ...formData, locations: newLocations });
                        }
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{location.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {formData.locations.length === 0
            ? 'La categoría se mostrará en todas las sedes'
            : `Se mostrará en: ${formData.locations.join(', ')}`
          }
        </p>
      </div>

      {/* Sección de imagen */}
      <div className="border-t pt-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Imagen de categoría (opcional)</h4>

        {previewUrl ? (
          <div className="space-y-3">
            {/* Preview */}
            <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors shadow-lg"
                title="Eliminar imagen"
              >
                <MdDelete size={20} />
              </button>
            </div>

            {/* Opciones */}
            {formData.image.url && (
              <>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Posición de la imagen</label>
                  <select
                    value={formData.image.position}
                    onChange={(e) => setFormData({
                      ...formData,
                      image: { ...formData.image, position: e.target.value }
                    })}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                  >
                    <option value="top">Arriba</option>
                    <option value="bottom">Abajo</option>
                    <option value="beside-title">Al lado del título</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Texto alternativo</label>
                  <input
                    type="text"
                    value={formData.image.alt}
                    onChange={(e) => setFormData({
                      ...formData,
                      image: { ...formData.image, alt: e.target.value }
                    })}
                    className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                    placeholder="Descripción de la imagen"
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <MdCloudUpload className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="mb-2 text-sm font-medium text-gray-900">
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

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {category ? 'Actualizar Categoría' : 'Crear Categoría'}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;