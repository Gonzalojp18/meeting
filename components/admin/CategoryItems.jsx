import React, { useState, useEffect, useRef, useCallback } from 'react';
import ItemForm from './ItemForm';
import { MdEdit, MdDelete, MdMoreVert, MdAdd, MdRestaurantMenu, MdDragIndicator } from 'react-icons/md';
import { Reorder } from 'framer-motion';

const CategoryItems = ({
  category,
  locations,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems
}) => {
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(null);
  const [localItems, setLocalItems] = useState(category.items || []);
  const reorderTimeoutRef = useRef(null);

  // Sync local items with parent data
  useEffect(() => {
    setLocalItems(category.items || []);
  }, [category.items]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (reorderTimeoutRef.current) clearTimeout(reorderTimeoutRef.current);
    };
  }, []);

  const handleItemReorder = useCallback((newOrder) => {
    setLocalItems(newOrder);

    if (reorderTimeoutRef.current) clearTimeout(reorderTimeoutRef.current);
    reorderTimeoutRef.current = setTimeout(() => {
      const orderedIds = newOrder.map(item => item._id);
      onReorderItems(orderedIds);
    }, 300);
  }, [onReorderItems]);

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

  const handleToggleAvailability = (item) => {
    onUpdateItem(category._id, item._id, { isAvailable: item.isAvailable === false });
  };

  // Filtrar locations sin "Menu sin precios"
  const activeLocations = locations.filter(loc => loc.name !== 'Menu sin precios');

  // Grid template columns: drag + name + description + N prices + actions
  const gridCols = `40px 1fr 1fr ${activeLocations.map(() => 'minmax(80px, auto)').join(' ')} 120px`;

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

      {/* ========== DESKTOP: GRID CON DRAG & DROP ========== */}
      <div className="hidden lg:block overflow-x-auto">
        {/* Header row */}
        <div
          className="grid gap-4 items-center px-6 py-4 bg-gray-100 border-b-2 border-gray-200"
          style={{ gridTemplateColumns: gridCols }}
        >
          <span></span>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Producto</span>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Descripción</span>
          {activeLocations.map(location => (
            <span
              key={location._id}
              className="text-xs font-bold text-gray-700 uppercase tracking-wider text-right whitespace-nowrap"
              title={location.name}
            >
              {location.name.length > 12 ? location.name.substring(0, 10) + '...' : location.name}
            </span>
          ))}
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Acciones</span>
        </div>

        {/* Items list */}
        {localItems.length > 0 ? (
          <Reorder.Group
            axis="y"
            values={localItems}
            onReorder={handleItemReorder}
            as="div"
            className="bg-white divide-y divide-gray-100"
          >
            {localItems.map(item => (
              editingItem?._id === item._id ? (
                <div key={item._id} className="p-5 lg:p-6 bg-orange-50">
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
                <Reorder.Item
                  key={item._id}
                  value={item}
                  as="div"
                  className={`grid gap-4 items-center px-6 py-4 hover:bg-orange-50/30 transition-colors group cursor-grab active:cursor-grabbing ${item.isAvailable === false ? 'opacity-50' : ''}`}
                  style={{ gridTemplateColumns: gridCols, touchAction: 'none' }}
                  whileDrag={{
                    scale: 1.01,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    backgroundColor: 'rgba(255, 247, 237, 0.95)',
                    zIndex: 50
                  }}
                >
                  {/* Drag handle */}
                  <div className="text-gray-300 group-hover:text-orange-500 transition-colors">
                    <MdDragIndicator className="h-5 w-5" />
                  </div>

                  {/* Product name */}
                  <div className="font-semibold text-gray-900 text-base flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${item.isAvailable !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                      title={item.isAvailable !== false ? 'Disponible — clic para desactivar' : 'No disponible — clic para activar'}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${item.isAvailable !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                    <span className="truncate">{item.name}</span>
                    {item.isAvailable === false && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 uppercase tracking-wide flex-shrink-0">
                        No disponible
                      </span>
                    )}
                    {item.customizations?.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide flex-shrink-0">
                        {item.customizations[0].name}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <div
                    className="text-sm text-gray-600 line-clamp-2 min-w-0"
                    title={item.description}
                  >
                    {item.description || (
                      <span className="text-gray-400 italic">Sin descripción</span>
                    )}
                  </div>

                  {/* Prices per location */}
                  {activeLocations.map(location => (
                    <div key={location._id} className="text-right">
                      {item.prices[location.nameId] !== undefined ? (
                        <span className="text-base font-bold text-gray-900">
                          ${item.prices[location.nameId].toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300 font-medium">N/A</span>
                      )}
                    </div>
                  ))}

                  {/* Actions */}
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
                </Reorder.Item>
              )
            ))}
          </Reorder.Group>
        ) : (
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

      {/* ========== MOBILE/TABLET: CARDS CON DRAG & DROP ========== */}
      <div className="lg:hidden">
        {localItems.length > 0 ? (
          <Reorder.Group
            axis="y"
            values={localItems}
            onReorder={handleItemReorder}
            as="div"
            className="divide-y divide-gray-100"
          >
            {localItems.map(item => (
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
                <Reorder.Item
                  key={item._id}
                  value={item}
                  as="div"
                  className={`p-4 relative bg-white hover:bg-orange-50/30 transition-colors cursor-grab active:cursor-grabbing ${item.isAvailable === false ? 'opacity-50' : ''}`}
                  style={{ touchAction: 'none' }}
                  whileDrag={{
                    scale: 1.02,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    backgroundColor: 'rgba(255, 247, 237, 0.95)',
                    zIndex: 50
                  }}
                >
                  {/* Header: Drag + Nombre + 3-dot menu */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {/* Drag handle */}
                      <div className="text-gray-300 pt-1 flex-shrink-0">
                        <MdDragIndicator className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${item.isAvailable !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                            title={item.isAvailable !== false ? 'Disponible — clic para desactivar' : 'No disponible — clic para activar'}
                          >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${item.isAvailable !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                          {item.isAvailable === false && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 uppercase tracking-wide">
                              No disponible
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 text-base mb-1.5 leading-tight flex items-center gap-2 flex-wrap">
                          {item.name}
                          {item.customizations?.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                              {item.customizations[0].name}
                            </span>
                          )}
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
                    </div>

                    {/* 3-dot menu */}
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
                          <div
                            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
                            onClick={() => setMobileMenuOpen(null)}
                          />
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

                  {/* Precios en GRID */}
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

                    {activeLocations.every(loc => item.prices[loc.nameId] === undefined) && (
                      <div className="col-span-2 text-center py-3 text-sm text-gray-400 italic">
                        Sin precios configurados
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">
                      {Object.keys(item.prices).length} {Object.keys(item.prices).length === 1 ? 'precio' : 'precios'} configurado{Object.keys(item.prices).length === 1 ? '' : 's'}
                    </span>
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
                </Reorder.Item>
              )
            ))}
          </Reorder.Group>
        ) : (
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
