import React from 'react';
import { defaultStyles, compactStyles, featuredStyles } from "./styleCategory";
import { motion } from 'framer-motion';
import useCartStore from '../../store/cartStore';
import { MdAdd, MdRemove } from 'react-icons/md';

const styles = {
    default: defaultStyles,
    compact: compactStyles,
    featured: featuredStyles,
};

const Category = ({ category, locationId, isTakeaway = false }) => {
    const { items: cartItems, addItem, removeItem } = useCartStore();
    const style = styles[category.style || 'default'];

    const getItemQuantity = (itemId) => {
        return cartItems.find(i => i._id === itemId && i.locationId === locationId)?.quantity || 0;
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
                {category.items.map((item) => {
                    const quantity = getItemQuantity(item._id);
                    return (
                        <div key={item._id} className={`${style.item} relative group`}>
                            <div className="flex items-start gap-3 w-full">
                                <div className='flex flex-col text-left flex-1'>
                                    <h3 className={style.itemName}>
                                        {item.name}
                                    </h3>
                                    <p className={style.itemDescription}>{item.description}</p>

                                    {/* Controles de cantidad - Solo en modo Takeaway */}
                                    {isTakeaway && quantity > 0 && (
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
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <p className={style.price}>
                                        {item.prices[locationId] > 0 ? `$${item.prices[locationId].toLocaleString()}` : item.prices > 0 ? `$${item.prices.toLocaleString()}` : ''}
                                    </p>
                                    {/* Botón agregar - Solo en modo Takeaway */}
                                    {isTakeaway && quantity === 0 && (
                                        <button
                                            onClick={() => addItem({ ...item, price: item.prices[locationId] || item.prices }, locationId)}
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
        </div>
    );
};

export default Category;
