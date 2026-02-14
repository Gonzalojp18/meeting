import React, { useState } from 'react';
import { MdClose, MdAdd, MdRemove } from 'react-icons/md';

const ProductModal = ({ item, locationId, onClose, onAddToCart }) => {
    const price = item.prices[locationId] || item.prices;
    const groups = (item.customizations || []).filter(g => g.options?.some(o => o.isAvailable !== false));

    const [selections, setSelections] = useState(() => {
        const initial = {};
        groups.forEach((group, idx) => {
            if (group.type === 'multiple') {
                initial[idx] = group.options
                    .filter(o => o.isDefault && o.isAvailable !== false)
                    .map(o => o.name);
            } else {
                const defaultOpt = group.options?.find(o => o.isDefault && o.isAvailable !== false);
                initial[idx] = defaultOpt?.name || '';
            }
        });
        return initial;
    });
    const [quantity, setQuantity] = useState(1);

    const canAdd = groups.every((group, idx) => {
        if (!group.required) return true;
        if (group.type === 'multiple') {
            const min = group.minSelections || 1;
            return (selections[idx] || []).length >= min;
        }
        return !!selections[idx];
    });

    const handleSingleSelect = (groupIdx, optionName) => {
        setSelections(prev => ({ ...prev, [groupIdx]: optionName }));
    };

    const handleMultiToggle = (groupIdx, optionName, maxSelections) => {
        setSelections(prev => {
            const current = prev[groupIdx] || [];
            if (current.includes(optionName)) {
                return { ...prev, [groupIdx]: current.filter(n => n !== optionName) };
            }
            if (current.length >= maxSelections) return prev;
            return { ...prev, [groupIdx]: [...current, optionName] };
        });
    };

    const handleAdd = () => {
        if (!canAdd) return;

        const selectedCustomizations = groups
            .map((group, idx) => {
                if (group.type === 'multiple') {
                    const sel = selections[idx] || [];
                    if (sel.length === 0) return null;
                    return { groupName: group.name, selections: [...sel].sort() };
                }
                const sel = selections[idx];
                if (!sel) return null;
                return { groupName: group.name, selected: sel };
            })
            .filter(Boolean);

        onAddToCart(
            { ...item, price },
            locationId,
            selectedCustomizations,
            quantity
        );
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <h2 className="text-lg font-bold text-gray-900">Personalizar</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <MdClose size={22} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Info del plato */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                        {item.description && (
                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                        )}
                        <p className="text-lg font-bold text-orange-600 mt-2">
                            ${Number(price).toLocaleString()}
                        </p>
                    </div>

                    {/* Grupos de opciones */}
                    {groups.map((group, groupIdx) => (
                        <div key={groupIdx}>
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                    {group.name}
                                </h4>
                                {group.required && (
                                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">
                                        Obligatorio
                                    </span>
                                )}
                                {group.type === 'multiple' && (
                                    <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                        {group.minSelections === group.maxSelections
                                            ? `Elegí ${group.maxSelections}`
                                            : `Elegí ${group.minSelections}-${group.maxSelections}`}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {group.options?.map((opt) => {
                                    const optAvailable = opt.isAvailable !== false;

                                    if (group.type === 'multiple') {
                                        const currentSel = selections[groupIdx] || [];
                                        const isChecked = currentSel.includes(opt.name);
                                        const atMax = currentSel.length >= (group.maxSelections || 1);
                                        const isDisabled = !optAvailable || (!isChecked && atMax);

                                        return (
                                            <label
                                                key={opt.name}
                                                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                                    isDisabled && !isChecked
                                                        ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                                                        : isChecked
                                                            ? 'border-orange-500 bg-orange-50 cursor-pointer'
                                                            : 'border-gray-100 hover:border-gray-200 bg-white cursor-pointer'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => !isDisabled && handleMultiToggle(groupIdx, opt.name, group.maxSelections || 1)}
                                                        disabled={isDisabled}
                                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-30"
                                                    />
                                                    <span className={`text-sm font-medium ${
                                                        !optAvailable
                                                            ? 'text-gray-400 line-through'
                                                            : isChecked ? 'text-orange-700' : 'text-gray-700'
                                                    }`}>
                                                        {opt.name}
                                                    </span>
                                                </div>
                                                {!optAvailable && (
                                                    <span className="text-[10px] font-bold text-red-500 uppercase">
                                                        No disponible
                                                    </span>
                                                )}
                                            </label>
                                        );
                                    }

                                    // Single select - radio
                                    const isSelected = selections[groupIdx] === opt.name;
                                    return (
                                        <label
                                            key={opt.name}
                                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                                !optAvailable
                                                    ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                                                    : isSelected
                                                        ? 'border-orange-500 bg-orange-50 cursor-pointer'
                                                        : 'border-gray-100 hover:border-gray-200 bg-white cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    name={`group-${groupIdx}`}
                                                    value={opt.name}
                                                    checked={isSelected}
                                                    onChange={() => optAvailable && handleSingleSelect(groupIdx, opt.name)}
                                                    disabled={!optAvailable}
                                                    className="w-4 h-4 text-orange-600 focus:ring-orange-500 disabled:opacity-30"
                                                />
                                                <span className={`text-sm font-medium ${
                                                    !optAvailable
                                                        ? 'text-gray-400 line-through'
                                                        : isSelected ? 'text-orange-700' : 'text-gray-700'
                                                }`}>
                                                    {opt.name}
                                                </span>
                                            </div>
                                            {!optAvailable && (
                                                <span className="text-[10px] font-bold text-red-500 uppercase">
                                                    No disponible
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                            {/* Hint de selección para multiple */}
                            {group.type === 'multiple' && group.required && (
                                <p className={`text-xs mt-1.5 ${
                                    (selections[groupIdx] || []).length < (group.minSelections || 1)
                                        ? 'text-red-500'
                                        : 'text-gray-400'
                                }`}>
                                    {(selections[groupIdx] || []).length} de {group.minSelections || 1} seleccionado{(selections[groupIdx] || []).length !== 1 ? 's' : ''}
                                    {(selections[groupIdx] || []).length < (group.minSelections || 1) ? ' (faltan)' : ''}
                                </p>
                            )}
                        </div>
                    ))}

                    {/* Selector de cantidad */}
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                        <span className="text-sm font-bold text-gray-700">Cantidad</span>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                className="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 active:scale-95 transition-all"
                            >
                                <MdRemove size={18} />
                            </button>
                            <span className="font-black text-lg min-w-[24px] text-center">{quantity}</span>
                            <button
                                type="button"
                                onClick={() => setQuantity(q => q + 1)}
                                className="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-orange-600 active:scale-95 transition-all"
                            >
                                <MdAdd size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Botón agregar */}
                <div className="sticky bottom-0 bg-white border-t p-5">
                    <button
                        onClick={handleAdd}
                        disabled={!canAdd}
                        className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold text-base shadow-lg hover:bg-orange-700 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        Agregar al pedido — ${(Number(price) * quantity).toLocaleString()}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;
