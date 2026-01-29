import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const MenuGallery = ({ items }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item, index) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative aspect-square overflow-hidden rounded-lg"
                >
                    <Image
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transform transition-transform duration-300 hover:scale-110"
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-white text-xl font-medium">{item.name}</p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default MenuGallery;