import React, { useState } from 'react';
import { MdClose, MdAdd, MdRemove } from 'react-icons/md';

const ProductModal = ({ item, locationId, onClose, onAddToCart }) => {
    const price = item.prices[locationId] || item.prices;
    const customization = item.customizations?.[0];

    const [selectedOption, setSelectedOption] = useState(
        customization?.options?.find(o => o.isDefault && o.isAvailable !== false)?.name || ''
    );
    const [quantity, setQuantity] = useState(1);

    const isRequired = customization?.required;
    const canAdd = !isRequired || selectedOption;

    const handleAdd = () => {
        if (!canAdd) return;

        const selectedCustomizations = selectedOption
            ? [{ groupName: customization.name, selected: selectedOption }]
            : [];

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

                    {/* Opciones de guarnición */}
                    {customization && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                    {customization.name}
                                </h4>
                                {isRequired && (
                                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">
                                        Obligatorio
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {customization.options?.map((opt) => {
                                    const optAvailable = opt.isAvailable !== false;
                                    return (
                                        <label
                                            key={opt.name}
                                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                                !optAvailable
                                                    ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                                                    : selectedOption === opt.name
                                                        ? 'border-orange-500 bg-orange-50 cursor-pointer'
                                                        : 'border-gray-100 hover:border-gray-200 bg-white cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    name="customization"
                                                    value={opt.name}
                                                    checked={selectedOption === opt.name}
                                                    onChange={() => optAvailable && setSelectedOption(opt.name)}
                                                    disabled={!optAvailable}
                                                    className="w-4 h-4 text-orange-600 focus:ring-orange-500 disabled:opacity-30"
                                                />
                                                <span className={`text-sm font-medium ${
                                                    !optAvailable
                                                        ? 'text-gray-400 line-through'
                                                        : selectedOption === opt.name ? 'text-orange-700' : 'text-gray-700'
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
                        </div>
                    )}

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
