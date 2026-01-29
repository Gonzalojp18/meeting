import React, { useState } from 'react';
import ItemForm from './ItemForm';
import { MdEdit, MdDelete, MdMoreVert, MdAdd, MdRestaurantMenu } from 'react-icons/md';

const CategoryItems = ({
  category,
  locations,
  onAddItem,
  onUpdateItem,
  onDeleteItem
}) => {
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(null);

  const handleAddItem = (itemData) => {
    onAddItem(category._id, itemData);
    setIsAddingItem(false);
  };

  const handleUpdateItem = (itemData) => {
    onUpdateItem(category._id, editingItem._id, itemData);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId) => {
    if (confirm('¿Eliminar este producto?')) {
      onDeleteItem(category._id, itemId);
    }
  };

  // Filtrar locations sin "Menu sin precios"
  const activeLocations = locations.filter(loc => loc.name !== 'Menu sin precios');

  return (
    <div>
      {/* ========== HEADER MEJORADO ========== */}
      <div className="flex items-center justify-between p-5 lg:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 rounded-xl">
            <MdRestaurantMenu className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-gray-900">{category.name}</h3>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
              {category.items.length} {category.items.length === 1 ? 'producto' : 'productos'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddingItem(true)}
          className="inline-flex items-center gap-2 px-4 lg:px-5 py-2.5 lg:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-100"
        >
          <MdAdd className="h-5 w-5" />
          <span className="hidden sm:inline">Agregar Producto</span>
          <span className="sm:hidden">Agregar</span>
        </button>
      </div>

      {/* ========== FORM PARA AGREGAR ========== */}
      {isAddingItem && (
        <div className="p-5 lg:p-6 bg-orange-50 border-b border-orange-200">
          <div className="mb-3">
            <p className="text-sm font-semibold text-orange-900">Nuevo Producto</p>
            <p className="text-xs text-orange-700 mt-1">Completa los datos del nuevo producto</p>
          </div>
          <ItemForm
            locations={locations}
            onSubmit={handleAddItem}
            onCancel={() => setIsAddingItem(false)}
          />
        </div>
      )}

      {/* ========== DESKTOP: TABLA MEJORADA ========== */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Descripción
              </th>
              {activeLocations.map(location => (
                <th
                  key={location._id}
                  className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap"
                  title={location.name}
                >
                  {location.name.length > 12 ? location.name.substring(0, 10) + '...' : location.name}
                </th>
              ))}
              <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-32">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {category.items.map(item => (
              editingItem?._id === item._id ? (
                <tr key={item._id} className="bg-orange-50">
                  <td colSpan={3 + activeLocations.length} className="p-5 lg:p-6">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-orange-900">Editando: {item.name}</p>
                      <p className="text-xs text-orange-700 mt-1">Modifica los datos del producto</p>
                    </div>
                    <ItemForm
                      item={item}
                      locations={locations}
                      onSubmit={handleUpdateItem}
                      onCancel={() => setEditingItem(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={item._id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 text-base">
                      {item.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="text-sm text-gray-600 max-w-md line-clamp-2"
                      title={item.description}
                    >
                      {item.description || (
                        <span className="text-gray-400 italic">Sin descripción</span>
                      )}
                    </div>
                  </td>
                  {activeLocations.map(location => (
                    <td key={location._id} className="px-6 py-4 text-right">
                      {item.prices[location.nameId] !== undefined ? (
                        <span className="inline-flex items-center justify-end text-base font-bold text-gray-900">
                          ${item.prices[location.nameId].toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300 font-medium">N/A</span>
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-2.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                        title="Editar producto"
                      >
                        <MdEdit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                        title="Eliminar producto"
                      >
                        <MdDelete className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>

        {category.items.length === 0 && (
          <div className="text-center py-16 bg-gradient-to-b from-white to-gray-50">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
              <MdRestaurantMenu className="h-8 w-8 text-orange-400" />
            </div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">
              No hay productos en esta categoría
            </h4>
            <p className="text-sm text-gray-500 mb-6">
              Comienza agregando tu primer producto
            </p>
            <button
              onClick={() => setIsAddingItem(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <MdAdd className="h-5 w-5" />
              Agregar Producto
            </button>
          </div>
        )}
      </div>

      {/* ========== MOBILE/TABLET: CARDS MEJORADAS ========== */}
      <div className="lg:hidden divide-y divide-gray-100">
        {category.items.map(item => (
          editingItem?._id === item._id ? (
            <div key={item._id} className="p-4 bg-orange-50">
              <div className="mb-3">
                <p className="text-sm font-semibold text-orange-900">Editando: {item.name}</p>
                <p className="text-xs text-orange-700 mt-1">Modifica los datos del producto</p>
              </div>
              <ItemForm
                item={item}
                locations={locations}
                onSubmit={handleUpdateItem}
                onCancel={() => setEditingItem(null)}
              />
            </div>
          ) : (
            <div key={item._id} className="p-4 relative bg-white hover:bg-orange-50/30 transition-colors">
              {/* Header: Nombre + 3-dot menu */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-base mb-1.5 leading-tight">
                    {item.name}
                  </h4>
                  {item.description && (
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {!item.description && (
                    <p className="text-sm text-gray-400 italic">
                      Sin descripción
                    </p>
                  )}
                </div>

                {/* 3-dot menu mejorado */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setMobileMenuOpen(mobileMenuOpen === item._id ? null : item._id)}
                    className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
                    aria-label="Más opciones"
                  >
                    <MdMoreVert className="h-6 w-6 text-gray-400" />
                  </button>

                  {mobileMenuOpen === item._id && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(null)}
                      />

                      {/* Menu */}
                      <div className="absolute right-0 top-12 z-40 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 animate-fade-in">
                        <button
                          onClick={() => {
                            setEditingItem(item)
                            setMobileMenuOpen(null)
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-3 transition-colors"
                        >
                          <MdEdit className="h-5 w-5" />
                          Editar producto
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={() => {
                            handleDeleteItem(item._id)
                            setMobileMenuOpen(null)
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                        >
                          <MdDelete className="h-5 w-5" />
                          Eliminar producto
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Precios en GRID mejorado */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
                {activeLocations.map(location => (
                  item.prices[location.nameId] !== undefined ? (
                    <div
                      key={location._id}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                        <span className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                          {location.name.length > 10 ? location.name.substring(0, 8) + '...' : location.name}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 block">
                        ${item.prices[location.nameId].toLocaleString('es-AR')}
                      </span>
                    </div>
                  ) : null
                ))}

                {/* Si no hay precios, mostrar mensaje */}
                {activeLocations.every(loc => item.prices[loc.nameId] === undefined) && (
                  <div className="col-span-2 text-center py-3 text-sm text-gray-400 italic">
                    Sin precios configurados
                  </div>
                )}
              </div>

              {/* Badge de cantidad de precios (opcional) */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-medium">
                  {Object.keys(item.prices).length} {Object.keys(item.prices).length === 1 ? 'precio' : 'precios'} configurado{Object.keys(item.prices).length === 1 ? '' : 's'}
                </span>

                {/* Quick actions mobile */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all active:scale-95"
                    title="Editar"
                  >
                    <MdEdit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item._id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95"
                    title="Eliminar"
                  >
                    <MdDelete className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        ))}

        {category.items.length === 0 && (
          <div className="text-center py-16 bg-gradient-to-b from-white to-gray-50">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
              <MdRestaurantMenu className="h-8 w-8 text-orange-400" />
            </div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">
              No hay productos
            </h4>
            <p className="text-sm text-gray-500 mb-6 px-4">
              Comienza agregando tu primer producto a esta categoría
            </p>
            <button
              onClick={() => setIsAddingItem(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-md active:scale-95"
            >
              <MdAdd className="h-5 w-5" />
              Agregar Producto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryItems;