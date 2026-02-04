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
