import React, { useState } from 'react';
import { MdEdit, MdDelete, MdAdd, MdMoreVert, MdDragIndicator, MdCloudUpload, MdCategory, MdImage } from 'react-icons/md';

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
    locations: [],
    schedule: { availableFrom: '', availableTo: '' }
  });

  const getInitialFormData = () => ({
    name: '',
    subtitle: '',
    style: 'default',
    image: { url: '', position: 'top', alt: '' },
    locations: [],
    schedule: { availableFrom: '', availableTo: '' }
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
    // Limpiar schedule: convertir strings vacíos a null para Mongoose
    const dataToSend = {
      ...formData,
      schedule: {
        availableFrom: formData.schedule.availableFrom || null,
        availableTo: formData.schedule.availableTo || null
      }
    };
    if (editingCategory) {
      onUpdateCategory(editingCategory._id, dataToSend);
      setEditingCategory(null);
    } else {
      onAddCategory(dataToSend);
    }
    setIsAdding(false);
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
      locations: category.locations || [],
      schedule: {
        availableFrom: category.schedule?.availableFrom || '',
        availableTo: category.schedule?.availableTo || ''
      }
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

  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === 'string') return image;
    return image.url || null;
  };

  return (
    <div>
      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Categorías</h2>
          <p className="text-sm text-gray-600 mt-1.5">
            Administra las categorías de tu menú ·
            <span className="font-semibold text-purple-600 ml-1">{categories.length} activas</span>
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-100"
        >
          <MdAdd className="h-5 w-5" />
          <span className="hidden sm:inline">Nueva Categoría</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* ========== FORM ========== */}
      {isAdding && (
        <div className="mb-6 p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl border-2 border-purple-200 shadow-lg">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-purple-500 rounded-xl">
              <MdCategory className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-purple-900">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <p className="text-sm text-purple-700">
                {editingCategory ? 'Modifica los datos de la categoría' : 'Completa la información'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
                  placeholder="Ej: Desayunos & Meriendas"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subtítulo (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
                  placeholder="Descripción breve"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estilo de Vista
                </label>
                <select
                  value={formData.style}
                  onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
                >
                  <option value="default">📄 Default</option>
                  <option value="compact">📋 Compacto</option>
                  <option value="featured">⭐ Destacado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Disponibilidad en Sedes
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
                >
                  <option value="all">🌍 Todas las sedes</option>
                  <option value="specific">📍 Sedes específicas</option>
                </select>
              </div>
            </div>

            {/* Checkboxes de sedes específicas */}
            {formData.locations.length > 0 && (
              <div className="p-4 bg-white rounded-xl border-2 border-purple-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Selecciona las sedes:</p>
                <div className="flex flex-wrap gap-3">
                  {locations.map((loc) => (
                    <label
                      key={loc._id}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer transition-colors border border-purple-200"
                    >
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
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{loc.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Horario de disponibilidad para takeaway */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Horario de Takeaway
              </label>
              <select
                value={formData.schedule.availableFrom ? 'custom' : 'all'}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setFormData({ ...formData, schedule: { availableFrom: '', availableTo: '' } });
                  } else {
                    setFormData({ ...formData, schedule: { availableFrom: '12:00', availableTo: '20:30' } });
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all"
              >
                <option value="all">Toda la jornada del local</option>
                <option value="custom">Horario personalizado</option>
              </select>
            </div>

            {formData.schedule.availableFrom && (
              <div className="p-4 bg-white rounded-xl border-2 border-orange-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Horario personalizado para takeaway:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                    <input
                      type="time"
                      value={formData.schedule.availableFrom}
                      onChange={(e) => setFormData({
                        ...formData,
                        schedule: { ...formData.schedule, availableFrom: e.target.value }
                      })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                    <input
                      type="time"
                      value={formData.schedule.availableTo}
                      onChange={(e) => setFormData({
                        ...formData,
                        schedule: { ...formData.schedule, availableTo: e.target.value }
                      })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
                <p className="text-xs text-orange-600 mt-2">
                  Esta categoría solo estará disponible en takeaway durante este horario
                </p>
              </div>
            )}

            {/* Imagen con Cloudinary */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Imagen de la Categoría
              </label>
              {formData.image.url ? (
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-purple-200">
                  <img
                    src={formData.image.url}
                    alt="Preview"
                    className="w-20 h-20 rounded-xl object-cover shadow-md"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Imagen cargada</p>
                    <p className="text-xs text-gray-500 mt-1">La imagen se mostrará en el menú</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: { url: '', position: 'top', alt: '' } })}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-3 px-6 py-8 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all group">
                  <div className="p-3 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                    <MdCloudUpload className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold text-gray-700 block">
                      {uploading ? 'Subiendo imagen...' : 'Haz clic para subir una imagen'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 block">
                      JPG, PNG o WebP • Máx 2MB
                    </span>
                  </div>
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

            <div className="flex gap-3 justify-end pt-4 border-t-2 border-purple-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-md"
              >
                {editingCategory ? '✓ Actualizar' : '+ Crear Categoría'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========== DESKTOP: LISTA ========== */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
          {categories.length === 0 ? (
            <div className="text-center py-20 bg-gradient-to-b from-white to-gray-50">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
                <MdCategory className="h-8 w-8 text-purple-400" />
              </div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                No hay categorías creadas
              </h4>
              <p className="text-sm text-gray-500 mb-6">
                Comienza creando tu primera categoría de menú
              </p>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <MdAdd className="h-5 w-5" />
                Crear Primera Categoría
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map((category) => (
                <div
                  key={category._id}
                  className="flex items-center gap-5 p-5 hover:bg-purple-50/30 transition-colors group"
                >
                  {/* Drag handle */}
                  <div className="flex-shrink-0 cursor-move text-gray-300 hover:text-purple-500 transition-colors">
                    <MdDragIndicator className="h-6 w-6" />
                  </div>

                  {/* Imagen */}
                  <div className="flex-shrink-0">
                    {getImageUrl(category.image) ? (
                      <img
                        src={getImageUrl(category.image)}
                        alt={category.image?.alt || category.name}
                        className="w-16 h-16 rounded-xl object-cover shadow-md border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-200">
                        <MdImage className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-base mb-1">
                      {category.name}
                    </h4>
                    {category.subtitle && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                        {category.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                        {category.style === 'default' && '📄'}
                        {category.style === 'compact' && '📋'}
                        {category.style === 'featured' && '⭐'}
                        {category.style || 'default'}
                      </span>
                      {category.locations?.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          📍 {category.locations.join(', ')}
                        </span>
                      )}
                      {category.schedule?.availableFrom && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                          {category.schedule.availableFrom} - {category.schedule.availableTo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Count */}
                  <div className="flex-shrink-0 text-center px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-lg font-bold text-gray-900 block">
                      {category.items?.length || 0}
                    </span>
                    <p className="text-xs text-gray-500 font-medium">productos</p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                      title="Editar categoría"
                    >
                      <MdEdit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(category._id)}
                      className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                      title="Eliminar categoría"
                    >
                      <MdDelete className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========== MOBILE: CARDS ========== */}
      <div className="lg:hidden space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
              <MdCategory className="h-8 w-8 text-purple-400" />
            </div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">
              No hay categorías
            </h4>
            <p className="text-sm text-gray-500 mb-6 px-4">
              Crea tu primera categoría de menú
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <MdAdd className="h-5 w-5" />
              Crear Categoría
            </button>
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category._id}
              className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Drag + Image */}
                <div className="flex items-start gap-2 flex-shrink-0">
                  <div className="cursor-move text-gray-300 pt-1">
                    <MdDragIndicator className="h-6 w-6" />
                  </div>
                  {getImageUrl(category.image) ? (
                    <img
                      src={getImageUrl(category.image)}
                      alt={category.image?.alt || category.name}
                      className="w-20 h-20 rounded-xl object-cover shadow-md border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-200">
                      <MdImage className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-base mb-1.5 leading-tight">
                    {category.name}
                  </h4>
                  {category.subtitle && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {category.subtitle}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      {category.items?.length || 0} productos
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      {category.style || 'default'}
                    </span>
                    {category.schedule?.availableFrom && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                        {category.schedule.availableFrom} - {category.schedule.availableTo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setMobileMenuOpen(mobileMenuOpen === category._id ? null : category._id)}
                    className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <MdMoreVert className="h-6 w-6 text-gray-400" />
                  </button>

                  {mobileMenuOpen === category._id && (
                    <>
                      <div
                        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-12 z-40 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 animate-fade-in">
                        <button
                          onClick={() => {
                            handleEdit(category)
                            setMobileMenuOpen(null)
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-3 transition-colors"
                        >
                          <MdEdit className="h-5 w-5" />
                          Editar categoría
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={() => {
                            handleDelete(category._id)
                            setMobileMenuOpen(null)
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                        >
                          <MdDelete className="h-5 w-5" />
                          Eliminar categoría
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