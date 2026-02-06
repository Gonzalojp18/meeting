import React, { useState } from 'react';
import { defaultStyles, compactStyles, featuredStyles } from "./styleCategory";
import { motion } from 'framer-motion';
import useCartStore from '../../store/cartStore';
import { MdAdd, MdRemove } from 'react-icons/md';
import ProductModal from './ProductModal';

const styles = {
    default: defaultStyles,
    compact: compactStyles,
    featured: featuredStyles,
};

const Category = ({ category, locationId, isTakeaway = false }) => {
    const { items: cartItems, addItem, removeItem } = useCartStore();
    const style = styles[category.style || 'default'];
    const [modalItem, setModalItem] = useState(null);

    const hasCustomizations = (item) => item.customizations?.length > 0;

    const getItemQuantity = (itemId) => {
        return cartItems
            .filter(i => i._id === itemId && i.locationId === locationId)
            .reduce((sum, i) => sum + i.quantity, 0);
    };

    const handleAddToCart = (item, locId, selectedCustomizations, quantity) => {
        addItem(item, locId, selectedCustomizations, quantity);
    };

    const renderImage = (position) => {
        if (!category.image || !category.image.url || category.image.position !== position) return null;

        const imgSrc = category.image.url.replace(/^\.\.\//, '/');

        return (
            <div className={`${style.image.container} ${style.image[position]}`}>
                <img
                    src={imgSrc}
                    alt={category.image.alt || category.name}
                    className={position === 'beside-title' ? style.image['beside-title'] : style.image.img}
                    width={position === 'beside-title' ? 60 : 400}
                    height={position === 'beside-title' ? 60 : 300}
                />
            </div>
        );
    };

    // Renderizado para modo takeaway - nuevo diseño
    if (isTakeaway) {
        return (
            <div className="mb-8">
                {/* Header de categoría estilo referencia */}
                <motion.div
                    id={`category-${category._id}`}
                    className="bg-[#8fa9bc] py-3 px-4 mb-4 scroll-mt-48"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <h2 className="text-white text-lg font-bold tracking-wide uppercase">
                        {category.name}
                    </h2>
                </motion.div>

                {/* Grid de productos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
                    {(category.items || []).map((item, index) => {
                        const quantity = getItemQuantity(item._id);
                        const itemHasCustomizations = hasCustomizations(item);
                        const isAvailable = item.isAvailable !== false;
                        const itemPrice = item.prices[locationId] || item.prices;

                        return (
                            <motion.div
                                key={item._id}
                                className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${!isAvailable ? 'opacity-50' : ''}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <div className="flex p-3 gap-3">
                                    {/* Imagen del producto */}
                                    <div className="flex-shrink-0">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-28 h-28 md:w-32 md:h-32 object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-28 h-28 md:w-32 md:h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                                                <span className="text-3xl text-gray-400">🍽️</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Contenido */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <h3 className="text-sm md:text-base font-bold text-gray-900 uppercase tracking-wide leading-tight mb-1">
                                            {item.name}
                                        </h3>
                                        <p className="text-xs md:text-sm text-gray-500 line-clamp-3 flex-1 leading-relaxed">
                                            {item.description}
                                        </p>

                                        {/* Precio y botón */}
                                        <div className="flex items-center justify-between mt-2 pt-2">
                                            <span className="text-base md:text-lg font-bold text-gray-800">
                                                {itemPrice > 0 ? `$${itemPrice.toLocaleString()}` : ''}
                                            </span>

                                            {/* Controles */}
                                            {isAvailable ? (
                                                <>
                                                    {/* Sin customizaciones y sin cantidad */}
                                                    {!itemHasCustomizations && quantity === 0 && (
                                                        <button
                                                            onClick={() => addItem({ ...item, price: itemPrice }, locationId)}
                                                            className="w-9 h-9 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                                        >
                                                            <MdAdd size={22} />
                                                        </button>
                                                    )}

                                                    {/* Sin customizaciones y con cantidad */}
                                                    {!itemHasCustomizations && quantity > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => removeItem(item._id, locationId)}
                                                                className="w-7 h-7 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                                            >
                                                                <MdRemove size={18} />
                                                            </button>
                                                            <span className="font-bold text-sm min-w-[20px] text-center">{quantity}</span>
                                                            <button
                                                                onClick={() => addItem({ ...item, price: itemPrice }, locationId)}
                                                                className="w-7 h-7 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                                            >
                                                                <MdAdd size={18} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Con customizaciones */}
                                                    {itemHasCustomizations && (
                                                        <div className="flex items-center gap-2">
                                                            {quantity > 0 && (
                                                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                                                    {quantity}
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => setModalItem(item)}
                                                                className="w-9 h-9 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                                            >
                                                                <MdAdd size={22} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-full">
                                                    No disponible
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Modal de personalización */}
                {modalItem && (
                    <ProductModal
                        item={modalItem}
                        locationId={locationId}
                        onClose={() => setModalItem(null)}
                        onAddToCart={handleAddToCart}
                    />
                )}
            </div>
        );
    }

    // Renderizado para modo local - diseño original
    const renderTitle = () => (
        <motion.div
            id={`category-${category._id}`}
            className="flex flex-col items-center scroll-mt-20"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex items-center">
                <h2 className={style.title}>{category.name}</h2>
                {renderImage('beside-title')}
            </div>
            {category.subtitle && (
                <p className={style.subtitle}>{category.subtitle}</p>
            )}
        </motion.div>
    );

    return (
        <div className={style.container}>
            {renderImage('top')}
            {renderTitle()}
            <div className={style.grid}>
                {(category.items || []).map((item) => {
                    const quantity = getItemQuantity(item._id);
                    const itemHasCustomizations = hasCustomizations(item);
                    const isAvailable = item.isAvailable !== false;

                    return (
                        <div key={item._id} className={`${style.item} relative group ${!isAvailable && isTakeaway ? 'opacity-50' : ''}`}>
                            <div className="flex items-start gap-3 w-full">
                                <div className='flex flex-col text-left flex-1'>
                                    <h3 className={style.itemName}>
                                        {item.name}
                                    </h3>
                                    <p className={style.itemDescription}>{item.description}</p>

                                    {/* Etiqueta no disponible */}
                                    {isTakeaway && !isAvailable && (
                                        <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
                                            No disponible
                                        </span>
                                    )}

                                    {/* Controles de cantidad - Solo takeaway, solo items SIN customizations y disponibles */}
                                    {isTakeaway && isAvailable && !itemHasCustomizations && quantity > 0 && (
                                        <div className="flex items-center gap-3 mt-3">
                                            <button
                                                onClick={() => removeItem(item._id, locationId)}
                                                className="p-1 bg-gray-100 rounded-full text-gray-600 hover:bg-orange-100 hover:text-orange-600 transition-colors"
                                            >
                                                <MdRemove size={18} />
                                            </button>
                                            <span className="font-bold text-sm">{quantity}</span>
                                            <button
                                                onClick={() => addItem({ ...item, price: item.prices[locationId] || item.prices }, locationId)}
                                                className="p-1 bg-gray-100 rounded-full text-gray-600 hover:bg-orange-100 hover:text-orange-600 transition-colors"
                                            >
                                                <MdAdd size={18} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Badge de cantidad - Items CON customizations y disponibles */}
                                    {isTakeaway && isAvailable && itemHasCustomizations && quantity > 0 && (
                                        <div className="mt-3">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                                {quantity} en tu pedido
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <p className={style.price}>
                                        {item.prices[locationId] > 0 ? `$${item.prices[locationId].toLocaleString()}` : item.prices > 0 ? `$${item.prices.toLocaleString()}` : ''}
                                    </p>
                                    {/* Botón agregar - Items SIN customizations, disponibles */}
                                    {isTakeaway && isAvailable && !itemHasCustomizations && quantity === 0 && (
                                        <button
                                            onClick={() => addItem({ ...item, price: item.prices[locationId] || item.prices }, locationId)}
                                            className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-all shadow-md active:scale-95"
                                        >
                                            <MdAdd size={20} />
                                        </button>
                                    )}
                                    {/* Botón agregar - Items CON customizations, disponibles */}
                                    {isTakeaway && isAvailable && itemHasCustomizations && (
                                        <button
                                            onClick={() => setModalItem(item)}
                                            className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-all shadow-md active:scale-95"
                                        >
                                            <MdAdd size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {renderImage('bottom')}

            {/* Modal de personalización */}
            {modalItem && (
                <ProductModal
                    item={modalItem}
                    locationId={locationId}
                    onClose={() => setModalItem(null)}
                    onAddToCart={handleAddToCart}
                />
            )}
        </div>
    );
};

export default Category;
