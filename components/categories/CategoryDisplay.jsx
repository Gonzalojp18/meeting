import React, { useState, useMemo } from 'react';
import { defaultStyles, compactStyles, featuredStyles } from "./styleCategory";
import { motion } from 'framer-motion';
import useCartStore from '../../store/cartStore';
import { MdAdd, MdRemove } from 'react-icons/md';
import ProductModal from './ProductModal';
import UpsellingMicroMessage from '../upselling/UpsellingMicroMessage';
import { useProductUpselling } from '../../hooks/useProductUpselling';

const styles = {
    default: defaultStyles,
    compact: compactStyles,
    featured: featuredStyles,
};

const Category = ({ category, locationId, isTakeaway = false, displayOnly = false, menuType = 'standard' }) => {
    const { items: cartItems, addItem, removeItem, replaceItem } = useCartStore();
    const style = styles[category.style || 'default'];
    const [modalItem, setModalItem] = useState(null);

    // Get cart item IDs for this category to fetch upsellings
    const cartItemIdsInCategory = useMemo(() => {
        const categoryItemIds = (category.items || []).map(i => i._id);
        return cartItems
            .filter(ci => categoryItemIds.includes(ci._id) && ci.locationId === locationId)
            .map(ci => ci._id);
    }, [cartItems, category.items, locationId]);

    // Fetch upsellings for products in cart
    const { upsellings: productUpsellings, dismissUpselling } = useProductUpselling(
        isTakeaway && !displayOnly ? cartItemIdsInCategory : [],
        locationId
    );

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
                    className="bg-gradient-to-r from-orange-500 to-orange-600 py-3 px-4 mb-4 scroll-mt-64"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <h2 className="text-white text-lg font-bold tracking-wide uppercase">
                        {category.name}
                    </h2>
                    {category.subtitle && (
                        <p className="text-white/80 text-sm font-normal mt-0.5">
                            {category.subtitle}
                        </p>
                    )}
                </motion.div>

                {/* Grid de productos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
                    {(category.items || []).map((item, index) => {
                        const quantity = getItemQuantity(item._id);
                        const itemHasCustomizations = hasCustomizations(item);
                        const isAvailable = item.isAvailable !== false && item.isAvailableToday !== false;
                        const isPreviewOnly = item.isAvailableToday === false && item.isAvailableInSelectedDay === true;
                        const itemPrice = item.prices?.[locationId] || item.prices || 0;
                        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

                        return (
                            <motion.div
                                key={item._id}
                                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-lg ${
                                    isPreviewOnly 
                                        ? 'border-gray-100 grayscale-[0.3] opacity-80' 
                                        : !isAvailable 
                                            ? 'border-gray-100 opacity-50' 
                                            : 'border-gray-200 hover:border-orange-200'
                                }`}
                                onClick={() => itemHasCustomizations && isAvailable && setModalItem(item)}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <div className="flex p-4 gap-4">
                                    {/* Imagen del producto con Overlay si es Preview */}
                                    <div className="flex-shrink-0 relative">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-28 h-28 md:w-32 md:h-32 object-cover rounded-xl shadow-inner"
                                            />
                                        ) : (
                                            <div className="w-28 h-28 md:w-32 md:h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border border-gray-100">
                                                <span className="text-3xl grayscale">🍽️</span>
                                            </div>
                                        )}
                                        {isPreviewOnly && (
                                            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                                                <div className="bg-white/90 px-2 py-1 rounded-lg shadow-sm border border-gray-100">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Próximamente</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Contenido */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-sm md:text-base font-black text-gray-900 uppercase tracking-tight leading-tight">
                                                {item.name}
                                            </h3>
                                        </div>
                                        {menuType === 'executive' && (
                                            <div className="mb-2">
                                                <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 uppercase tracking-tighter">
                                                    ✨ Incluye Bebida y Café
                                                </span>
                                            </div>
                                        )}
                                        <p className="text-xs md:text-sm text-gray-400 line-clamp-2 flex-1 leading-relaxed font-medium">
                                            {item.description}
                                        </p>

                                        {/* Micro-mensaje de upselling */}
                                        {!displayOnly && quantity > 0 && productUpsellings[item._id] && (
                                            <UpsellingMicroMessage
                                                upselling={productUpsellings[item._id]}
                                                triggerItemId={item._id}
                                                onAdd={(suggestedItem) => addItem(suggestedItem, locationId)}
                                                onReplace={(triggerId, newItem) => replaceItem(triggerId, newItem, locationId)}
                                                onDismiss={() => dismissUpselling(item._id)}
                                                locationId={locationId}
                                            />
                                        )}

                                        {/* Footer de la Card: Precio y Botones */}
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-gray-300 tracking-widest leading-none mb-1">Precio</span>
                                                <span className="text-base md:text-xl font-black text-gray-900">
                                                    {!displayOnly && itemPrice > 0 ? `$${itemPrice.toLocaleString()}` : '—'}
                                                </span>
                                            </div>

                                            {/* Controles de Acción */}
                                            {!displayOnly && isAvailable ? (
                                                <div className="flex items-center">
                                                    {!itemHasCustomizations && quantity === 0 && (
                                                        <button
                                                            onClick={() => addItem({ ...item, price: itemPrice }, locationId)}
                                                            className="h-10 px-4 bg-orange-600 text-white rounded-xl flex items-center gap-2 hover:bg-orange-700 transition-all shadow-md shadow-orange-200 active:scale-95 font-bold text-sm"
                                                        >
                                                            <MdAdd size={18} />
                                                            <span>Pedir</span>
                                                        </button>
                                                    )}

                                                    {!itemHasCustomizations && quantity > 0 && (
                                                        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); removeItem(item._id, locationId); }}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-orange-600 transition-colors"
                                                            >
                                                                <MdRemove size={18} />
                                                            </button>
                                                            <span className="font-black text-sm px-2 text-gray-900">{quantity}</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); addItem({ ...item, price: itemPrice }, locationId); }}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-orange-600 transition-colors"
                                                            >
                                                                <MdAdd size={18} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {itemHasCustomizations && (
                                                        <div className="flex items-center gap-2">
                                                            {quantity > 0 && (
                                                                <span className="bg-orange-100 text-orange-600 w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border border-orange-200">
                                                                    {quantity}
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setModalItem(item); }}
                                                                className="h-10 px-4 bg-orange-600 text-white rounded-xl flex items-center gap-2 hover:bg-orange-700 transition-all shadow-md shadow-orange-200 active:scale-95 font-bold text-sm"
                                                            >
                                                                <MdAdd size={18} />
                                                                <span>Personalizar</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : isPreviewOnly ? (
                                                <div className="flex flex-col items-end">
                                                   <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-xl">
                                                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" />
                                                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                                                         Vuelve el {dayNames[item.availableDays?.[0]]}
                                                      </span>
                                                   </div>
                                                </div>
                                            ) : !displayOnly ? (
                                                <span className="text-[10px] font-black text-red-400 uppercase bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                                                    Sin Stock
                                                </span>
                                            ) : null}
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
                    const isAvailable = item.isAvailable !== false && item.isAvailableToday !== false;
                    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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
                                        <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                            {item.isAvailableToday === false ? `Disponible: ${item.availableDays.map(d => dayNames[d]).join(', ')}` : 'No disponible'}
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
                                                onClick={() => addItem({ ...item, price: item.prices?.[locationId] || item.prices || 0 }, locationId)}
                                                className="p-1 bg-gray-100 rounded-full text-gray-600 hover:bg-orange-100 hover:text-orange-600 transition-colors"
                                            >
                                                <MdAdd size={18} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Controles de cantidad - Items CON customizations y disponibles */}
                                    {isTakeaway && isAvailable && itemHasCustomizations && quantity > 0 && (
                                        <div className="flex items-center gap-3 mt-3">
                                            <button
                                                onClick={() => removeItem(item._id, locationId)}
                                                className="p-1 bg-gray-100 rounded-full text-gray-600 hover:bg-orange-100 hover:text-orange-600 transition-colors"
                                            >
                                                <MdRemove size={18} />
                                            </button>
                                            <span className="font-bold text-sm">{quantity}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    {!displayOnly && (
                                        <p className={style.price}>
                                            {item.prices?.[locationId] > 0 ? `$${item.prices[locationId].toLocaleString()}` : (typeof item.prices === 'number' && item.prices > 0) ? `$${item.prices.toLocaleString()}` : ''}
                                        </p>
                                    )}
                                    {/* Botón agregar - Items SIN customizations, disponibles */}
                                    {isTakeaway && isAvailable && !itemHasCustomizations && quantity === 0 && (
                                        <button
                                            onClick={() => addItem({ ...item, price: item.prices?.[locationId] || item.prices || 0 }, locationId)}
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
