import React, { useState } from 'react';
import { MdEdit, MdDelete, MdAdd, MdMoreVert, MdDragIndicator, MdCloudUpload } from 'react-icons/md';

const CategoryManager = ({
  categories,
  locations,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subtitle: '',
    style: 'default',
    image: { url: '', position: 'top', alt: '' },
    locations: []
  });

  const getInitialFormData = () => ({
    name: '',
    subtitle: '',
    style: 'default',
    image: { url: '', position: 'top', alt: '' },
    locations: []
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });

      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          image: { ...prev.image, url: data.url, alt: prev.name || 'Imagen de categoría' }
        }));
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCategory) {
      onUpdateCategory(editingCategory._id, formData);
      setEditingCategory(null);
    } else {
      onAddCategory(formData);
      setIsAdding(false);
    }
    setFormData(getInitialFormData());
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      subtitle: category.subtitle || '',
      style: category.style || 'default',
      image: {
        url: category.image?.url || '',
        position: category.image?.position || 'top',
        alt: category.image?.alt || ''
      },
      locations: category.locations || []
    });
    setIsAdding(true);
  };

  const handleDelete = (categoryId) => {
    if (confirm('¿Eliminar esta categoría? Se eliminarán todos sus productos.')) {
      onDeleteCategory(categoryId);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingCategory(null);
    setFormData(getInitialFormData());
  };

  // Helper para obtener la URL de imagen (soporta objeto o string legacy)
  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === 'string') return image;
    return image.url || null;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestión de Categorías</h2>
          <p className="text-sm text-gray-500 mt-1">
            Administra las categorías de tu menú. Total: {categories.length} activas
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <MdAdd className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva Categoría</span>
        </button>
      </div>

      {/* Form para agregar/editar */}
      {isAdding && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Desayunos & Meriendas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtítulo
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estilo
                </label>
                <select
                  value={formData.style}
                  onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="default">Default</option>
                  <option value="compact">Compacto</option>
                  <option value="featured">Destacado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sedes
                </label>
                <select
                  value={formData.locations.length === 0 ? 'all' : 'specific'}
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setFormData({ ...formData, locations: [] });
                    } else if (locations.length > 0) {
                      setFormData({ ...formData, locations: [locations[0].nameId] });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todas las sedes</option>
                  <option value="specific">Sedes específicas</option>
                </select>
              </div>
            </div>

            {/* Checkboxes de sedes específicas */}
            {formData.locations.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-white rounded-lg border">
                {locations.map((loc) => (
                  <label key={loc._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.locations.includes(loc.nameId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, locations: [...formData.locations, loc.nameId] });
                        } else {
                          const newLocs = formData.locations.filter(l => l !== loc.nameId);
                          if (newLocs.length > 0) {
                            setFormData({ ...formData, locations: newLocs });
                          }
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    {loc.name}
                  </label>
                ))}
              </div>
            )}

            {/* Imagen con Cloudinary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagen
              </label>
              {formData.image.url ? (
                <div className="flex items-center gap-3">
                  <img src={formData.image.url} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: { url: '', position: 'top', alt: '' } })}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors">
                  <MdCloudUpload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {uploading ? 'Subiendo...' : 'Subir imagen'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingCategory ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DESKTOP: Lista full-width */}
      <div className="hidden md:block">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No hay categorías creadas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {categories.map((category) => (
                <div
                  key={category._id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Drag handle */}
                  <div className="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600">
                    <MdDragIndicator className="h-5 w-5" />
                  </div>

                  {/* Imagen */}
                  <div className="flex-shrink-0">
                    {getImageUrl(category.image) ? (
                      <img
                        src={getImageUrl(category.image)}
                        alt={category.image?.alt || category.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">Sin img</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {category.name}
                    </h4>
                    {category.subtitle && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {category.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{category.style || 'default'}</span>
                      {category.locations?.length > 0 && (
                        <span className="text-xs text-indigo-600">{category.locations.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  {/* Count */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {category.items?.length || 0}
                    </span>
                    <p className="text-xs text-gray-500">productos</p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <MdEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category._id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <MdDelete className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE: Cards compactas */}
      <div className="md:hidden space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 text-gray-500">
            <p className="text-sm">No hay categorías creadas</p>
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category._id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start gap-3">
                {/* Drag handle + Image */}
                <div className="flex items-start gap-2 flex-shrink-0">
                  <div className="cursor-move text-gray-400 pt-1">
                    <MdDragIndicator className="h-5 w-5" />
                  </div>
                  {getImageUrl(category.image) ? (
                    <img
                      src={getImageUrl(category.image)}
                      alt={category.image?.alt || category.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">Sin img</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {category.name}
                  </h4>
                  {category.subtitle && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {category.subtitle}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">{category.items?.length || 0} productos</span>
                    <span className="text-xs text-gray-400">• {category.style || 'default'}</span>
                  </div>
                </div>

                {/* 3-dot menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setMobileMenuOpen(mobileMenuOpen === category._id ? null : category._id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MdMoreVert className="h-5 w-5 text-gray-400" />
                  </button>

                  {mobileMenuOpen === category._id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setMobileMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-10 z-20 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                        <button
                          onClick={() => {
                            handleEdit(category)
                            setMobileMenuOpen(null)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <MdEdit className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            handleDelete(category._id)
                            setMobileMenuOpen(null)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <MdDelete className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryManager;