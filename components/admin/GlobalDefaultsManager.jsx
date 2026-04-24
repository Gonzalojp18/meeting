'use client'
import React, { useState } from 'react';
import { MdSettings, MdAdd, MdDelete, MdCheckCircle, MdSave } from 'react-icons/md';
import axios from 'axios';
import { handleAxiosError } from '../../utils/handleAxiosError';
import API_URI from '../../utils/getApiUri';

const GlobalDefaultsManager = ({ initialCustomizations = [], menuType, token, onUpdate }) => {
  const [groups, setGroups] = useState(initialCustomizations);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleAddGroup = () => {
    setGroups([...groups, {
      name: 'Bebida Incluida',
      type: 'single',
      required: true,
      options: [
        { name: 'Agua Mineral', priceModifier: 0, isAvailable: true },
        { name: 'Gaseosa', priceModifier: 0, isAvailable: true }
      ]
    }]);
  };

  const handleUpdateGroup = (index, data) => {
    const newGroups = [...groups];
    newGroups[index] = { ...newGroups[index], ...data };
    setGroups(newGroups);
  };

  const handleRemoveGroup = (index) => {
    setGroups(groups.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await axios.put(`${API_URI}/api/menu/defaults?type=${menuType}`, {
        customizations: groups
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('¡Opciones globales actualizadas! Ahora todos los productos de este menú mostrarán estas opciones.');
      if (onUpdate) onUpdate();
      setShowConfig(false);
    } catch (error) {
      handleAxiosError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 text-white rounded-lg">
            <MdSettings size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-tight">Opciones Globales {menuType === 'executive' ? 'B2B' : 'Menú'}</h3>
            <p className="text-xs text-blue-700">Configura opciones (ej: bebidas) que aparecerán en TODOS los platos automáticamente.</p>
          </div>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
        >
          {showConfig ? 'Cerrar Ajustes' : 'Configurar Bebidas Globales'}
        </button>
      </div>

      {showConfig && (
        <div className="mt-4 space-y-4 border-t border-blue-100 pt-4 animate-fadeIn">
          {groups.map((group, gIndex) => (
            <div key={gIndex} className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm relative">
              <button 
                onClick={() => handleRemoveGroup(gIndex)}
                className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <MdDelete size={18} />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nombre del Grupo</label>
                  <input 
                    type="text" 
                    value={group.name}
                    onChange={(e) => handleUpdateGroup(gIndex, { name: e.target.value })}
                    className="w-full text-sm border-b border-gray-200 focus:border-blue-500 outline-none pb-1"
                    placeholder="Ejem: Selección de Bebida"
                  />
                </div>
                <div className="flex items-end gap-2">
                   <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={group.required}
                        onChange={(e) => handleUpdateGroup(gIndex, { required: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="ml-2 text-xs font-medium text-gray-600">¿Es obligatorio?</span>
                   </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase">Opciones (Despliega en el menú)</label>
                {group.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={opt.name}
                      onChange={(e) => {
                        const newOptions = [...group.options];
                        newOptions[oIndex].name = e.target.value;
                        handleUpdateGroup(gIndex, { options: newOptions });
                      }}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
                    />
                    <button 
                      onClick={() => {
                        const newOptions = group.options.filter((_, i) => i !== oIndex);
                        handleUpdateGroup(gIndex, { options: newOptions });
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <MdDelete size={14} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    handleUpdateGroup(gIndex, { 
                      options: [...group.options, { name: 'Nueva Opción', priceModifier: 0, isAvailable: true }]
                    });
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <MdAdd size={12} /> Agregar Opción
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button 
              onClick={handleAddGroup}
              className="flex-1 py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 hover:bg-blue-100/50 transition-colors flex items-center justify-center gap-2 text-xs font-bold"
            >
              <MdAdd size={18} /> Agregar Nuevo Grupo de Opciones
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : <><MdSave size={18} /> Guardar Cambios Globales</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalDefaultsManager;
