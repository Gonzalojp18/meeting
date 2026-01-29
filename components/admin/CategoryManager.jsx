'use client'
import React, { useState } from 'react';
import CategoryForm from './CategoryForm';
import { MdEdit, MdDelete, MdAdd, MdDragIndicator, MdVisibility, MdVisibilityOff } from 'react-icons/md';

const CategoryManager = ({ categories, locations, onAddCategory, onUpdateCategory, onDeleteCategory }) => {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const handleAddCategory = (categoryData) => {
    onAddCategory(categoryData);
    setIsAddingCategory(false);
  };

  const handleUpdateCategory = (categoryData) => {
    onUpdateCategory(editingCategory._id, categoryData);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId, categoryName, itemCount) => {
    if (itemCount > 0) {
      const confirmed = window.confirm(
        `¿Estás seguro de eliminar la categoría "${categoryName}"?\n\nEsta categoría tiene ${itemCount} productos. Se desactivará pero los productos se mantendrán.`
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        `¿Estás seguro de eliminar la categoría "${categoryName}"?`
      );
      if (!confirmed) return;
    }
    
    onDeleteCategory(categoryId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Categorías</h2>
          <p className="text-sm text-gray-500 mt-1">
            Administra las categorías de tu menú. Total: {categories.filter(c => c.isActive).length} activas
          </p>
        </div>
        <button
          onClick={() => setIsAddingCategory(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <MdAdd size={20} />
          Nueva Categoría
        </button>
      </div>

      {/* Formulario de agregar categoría */}
      {isAddingCategory && (
        <div className="bg-white shadow sm:rounded-lg p-6 border-2 border-indigo-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Nueva Categoría</h3>
          <CategoryForm
            locations={locations}
            onSubmit={handleAddCategory}
            onCancel={() => setIsAddingCategory(false)}
          />
        </div>
      )}

      {/* Lista de categorías */}
      <div className="space-y-4">
        {categories.map((category) => (
          <div 
            key={category._id} 
            className={`bg-white shadow sm:rounded-lg p-6 border transition-all duration-200 ${
              !category.isActive ? 'opacity-50 border-gray-300' : 'border-gray-200 hover:border-indigo-200'
            }`}
          >
            {editingCategory?._id === category._id ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Categoría</h3>
                <CategoryForm
                  category={category}
                  locations={locations}
                  onSubmit={handleUpdateCategory}
                  onCancel={() => setEditingCategory(null)}
                />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="text-gray-400 cursor-move pt-1">
                    <MdDragIndicator size={24} />
                  </div>

                  {/* Preview de imagen */}
                  {category.image?.url && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      <img
                        src={category.image.url}
                        alt={category.image.alt || category.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
                      {!category.isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <MdVisibilityOff size={14} />
                          Inactiva
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {(category.items || []).length} productos
                      </span>
                    </div>
                    
                    {category.subtitle && (
                      <p className="text-sm text-gray-500 mt-1">{category.subtitle}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium">Estilo:</span> {category.style}
                      </span>
                      {category.image?.url && (
                        <span className="inline-flex items-center gap-1">
                          <MdVisibility size={14} />
                          Con imagen
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium">Sedes:</span>
                        {!category.locations || category.locations.length === 0
                          ? 'Todas'
                          : category.locations.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setEditingCategory(category)}
                    title="Editar categoría"
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <MdEdit size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category._id, category.name, (category.items || []).length)}
                    title={category.isActive ? "Desactivar categoría" : "Categoría desactivada"}
                    disabled={!category.isActive}
                    className={`p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      category.isActive 
                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' 
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <MdDelete size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-12 bg-white shadow sm:rounded-lg">
            <MdAdd className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay categorías</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza creando tu primera categoría de menú.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManager;