import React, { useState } from 'react';
import ItemForm from './ItemForm';
import { MdEdit, MdDelete } from 'react-icons/md';

const CategoryItems = ({
  category,
  locations,
  onAddItem,
  onUpdateItem,
  onDeleteItem
}) => {
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const handleAddItem = (itemData) => {
    onAddItem(category._id, itemData);
    setIsAddingItem(false);
  };

  const handleUpdateItem = (itemData) => {
    onUpdateItem(category._id, editingItem._id, itemData);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId) => {
    onDeleteItem(category._id, itemId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-semibold leading-6 text-gray-900">{category.name}</h3>
        <button
          onClick={() => setIsAddingItem(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Agregar Item
        </button>
      </div>

      {isAddingItem && (
        <div className="bg-white shadow sm:rounded-lg p-4">
          <ItemForm
            locations={locations}
            onSubmit={handleAddItem}
            onCancel={() => setIsAddingItem(false)}
          />
        </div>
      )}

      <div className="space-y-4">
        {category.items.map(item => (
          <div key={item._id} className="bg-white shadow sm:rounded-lg p-4 border border-gray-100 hover:border-indigo-100 transition-colors duration-200">
            {editingItem?._id === item._id ? (
              <ItemForm
                item={item}
                locations={locations}
                onSubmit={handleUpdateItem}
                onCancel={() => setEditingItem(null)}
              />
            ) : (
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex-1 text-left">
                    <h4 className="text-xl font-bold text-gray-900 leading-tight">{item.name}</h4>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                  <div className="flex space-x-1 ml-4">
                    <button
                      onClick={() => setEditingItem(item)}
                      title="Editar plato"
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <MdEdit size={22} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item._id)}
                      title="Eliminar plato"
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <MdDelete size={22} />
                    </button>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {locations.map(location => (
                    location.name === 'Menu sin precios' ? null :
                      <div key={location._id} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-200 text-left">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{location.name}</span>
                        {item.prices[location.nameId] !== undefined ? (
                          <span className="text-lg font-extrabold text-gray-900 mt-1">
                            ${item.prices[location.nameId].toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 mt-1 italic">No disponible</span>
                        )}
                      </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryItems;
