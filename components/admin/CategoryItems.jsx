import React, { useState } from 'react';
import ItemForm from './ItemForm';
import { MdEdit, MdDelete, MdMoreVert, MdAdd } from 'react-icons/md';

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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
        <button
          onClick={() => setIsAddingItem(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <MdAdd className="h-4 w-4" />
          <span className="hidden sm:inline">Agregar Item</span>
        </button>
      </div>

      {/* Form para agregar */}
      {isAddingItem && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <ItemForm
            locations={locations}
            onSubmit={handleAddItem}
            onCancel={() => setIsAddingItem(false)}
          />
        </div>
      )}

      {/* DESKTOP: Tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              {activeLocations.map(location => (
                <th key={location._id} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {location.name.length > 15 ? location.name.substring(0, 12) + '...' : location.name}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {category.items.map(item => (
              editingItem?._id === item._id ? (
                <tr key={item._id} className="bg-gray-50">
                  <td colSpan={3 + activeLocations.length} className="p-4">
                    <ItemForm
                      item={item}
                      locations={locations}
                      onSubmit={handleUpdateItem}
                      onCancel={() => setEditingItem(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">
                      {item.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 max-w-md truncate">
                      {item.description || '-'}
                    </div>
                  </td>
                  {activeLocations.map(location => (
                    <td key={location._id} className="px-4 py-3 text-right">
                      {item.prices[location.nameId] !== undefined ? (
                        <span className="text-sm font-semibold text-gray-900">
                          ${item.prices[location.nameId].toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Editar"
                      >
                        <MdEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <MdDelete className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>

        {category.items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No hay productos en esta categoría</p>
          </div>
        )}
      </div>

      {/* MOBILE: Cards compactas */}
      <div className="md:hidden divide-y divide-gray-200">
        {category.items.map(item => (
          editingItem?._id === item._id ? (
            <div key={item._id} className="p-4 bg-gray-50">
              <ItemForm
                item={item}
                locations={locations}
                onSubmit={handleUpdateItem}
                onCancel={() => setEditingItem(null)}
              />
            </div>
          ) : (
            <div key={item._id} className="p-4 relative">
              {/* Header: Nombre + 3-dot menu */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {item.name}
                  </h4>
                  {item.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* 3-dot menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setMobileMenuOpen(mobileMenuOpen === item._id ? null : item._id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MdMoreVert className="h-5 w-5 text-gray-400" />
                  </button>

                  {mobileMenuOpen === item._id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setMobileMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-10 z-20 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                        <button
                          onClick={() => {
                            setEditingItem(item)
                            setMobileMenuOpen(null)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <MdEdit className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteItem(item._id)
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

              {/* Precios inline */}
              <div className="flex flex-wrap gap-3 mt-3">
                {activeLocations.map(location => (
                  item.prices[location.nameId] !== undefined && (
                    <div key={location._id} className="flex items-baseline gap-1.5">
                      <span className="text-xs text-gray-500 font-medium">
                        {location.name.length > 8 ? location.name.substring(0, 6) + '...' : location.name}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        ${item.prices[location.nameId].toLocaleString('es-AR')}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )
        ))}

        {category.items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No hay productos en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryItems;