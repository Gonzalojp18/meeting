/**
 * SEED SCRIPT - Upselling Combinations
 * 
 * Carga 105+ combinaciones de upselling inteligente en la base de datos.
 * Los IDs de productos se resuelven dinámicamente desde el menú existente.
 * 
 * Uso: node scripts/seed-upselling.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Upselling from '../models/Upselling.js';
import Menu from '../models/Menu.js';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI no está definida en .env.local');
    process.exit(1);
}

// Helper para buscar producto por nombre (case insensitive, partial match)
function findItem(menu, namePattern) {
    const pattern = namePattern.toLowerCase();
    for (const category of menu.categories) {
        for (const item of category.items) {
            if (item.name && item.name.toLowerCase().includes(pattern)) {
                return {
                    itemId: item._id,
                    itemName: item.name,
                    categoryId: category._id,
                    categoryName: category.name
                };
            }
        }
    }
    return null;
}

// Helper para buscar categoría por nombre
function findCategory(menu, namePattern) {
    const pattern = namePattern.toLowerCase();
    for (const category of menu.categories) {
        if (category.name && category.name.toLowerCase().includes(pattern)) {
            return {
                categoryId: category._id,
                categoryName: category.name
            };
        }
    }
    return null;
}

// Definiciones de upsellings (sin IDs, se resuelven dinámicamente)
const upsellingDefinitions = [
    // ☕ CAFETERÍA - Upsells (10)
    { name: 'Pocillo + Medialuna', type: 'upsell', category: 'cafeteria', trigger: 'pocillo', suggested: ['medialuna de manteca'], copy: 'Sumale algo dulce ☕', ticketLevel: 'bajo', timing: 'mañana' },
    { name: 'Jarrito + Medialuna', type: 'upsell', category: 'cafeteria', trigger: 'jarrito', suggested: ['medialuna de manteca'], copy: 'Completá tu café', ticketLevel: 'bajo', timing: 'mañana' },
    { name: 'Café con Leche + Medialuna JQ', type: 'upsell', category: 'cafeteria', trigger: 'café con leche', suggested: ['medialuna rellena'], copy: '¿Algo salado?', ticketLevel: 'bajo', timing: 'mañana' },
    { name: 'Té + Cookie', type: 'upsell', category: 'cafeteria', trigger: 'té', suggested: ['cookie'], copy: 'Acompañá tu té 🍪', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Té con Leche + Muffin', type: 'upsell', category: 'cafeteria', trigger: 'té con leche', suggested: ['muffin vainilla'], copy: 'Algo dulce para el té', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Submarino + Alfajor', type: 'cross-sell', category: 'cafeteria', trigger: 'submarino', suggested: ['alfajor maicena'], copy: 'El clásico combo', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Capuchino + Pain au chocolat', type: 'upsell', category: 'cafeteria', trigger: 'capuchino', suggested: ['pain au chocolat'], copy: 'Merecés algo especial', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Café Doble + Croissant', type: 'upsell', category: 'cafeteria', trigger: 'café doble', suggested: ['croissant'], copy: 'Energía completa', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Café para llevar + Chipa', type: 'upsell', category: 'cafeteria', trigger: 'café para llevar', suggested: ['chipa'], copy: 'Para el camino', ticketLevel: 'bajo', timing: 'todo-el-dia' },
    { name: 'Café + Medialuna Upgrade', type: 'upgrade', category: 'cafeteria', trigger: 'café jarrito mas medialuna', suggested: ['medialuna de manteca', 'medialuna de manteca'], copy: 'Llevá más por poco más', ticketLevel: 'bajo', timing: 'mañana' },

    // 🥐 DESAYUNOS (7)
    { name: 'Café Tostadas + Exprimido', type: 'cross-sell', category: 'desayunos', trigger: 'café mas tostadas', suggested: ['naranja'], copy: 'Sumá vitaminas 🍊', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Exprimido Tostado + Bowl', type: 'upgrade', category: 'desayunos', trigger: 'exprimido mas tostado', suggested: ['bowl de yogurt'], copy: 'Hacelo más saludable', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Medialunas + Exprimido', type: 'cross-sell', category: 'desayunos', trigger: 'cafe con leche acompañado con 3 medialunas', suggested: ['naranja'], copy: 'Completá el desayuno', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Omelette + Café', type: 'cross-sell', category: 'desayunos', trigger: 'omellete', suggested: ['café con leche'], copy: 'Para cerrar perfecto', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Desayuno Campo + Green', type: 'cross-sell', category: 'desayunos', trigger: 'desayuno de campo', suggested: ['green'], copy: 'El balance ideal', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Bowl Durazno + Té', type: 'cross-sell', category: 'desayunos', trigger: 'bowl de yogurt duranzo', suggested: ['té'], copy: 'Infusión para acompañar', ticketLevel: 'bajo', timing: 'mañana' },
    { name: 'Bowl FR + Licuado', type: 'cross-sell', category: 'desayunos', trigger: 'bowl de yogurt frutos rojos', suggested: ['banana'], copy: 'Duplicá la energía', ticketLevel: 'medio', timing: 'mañana' },

    // 🍔 HAMBURGUESAS (5)
    { name: 'Burger + Cerveza Andes', type: 'cross-sell', category: 'hamburguesas', trigger: 'completa', suggested: ['cerveza andes lata'], copy: '¿Con una birra? 🍺', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Burger + Gaseosa', type: 'cross-sell', category: 'hamburguesas', trigger: 'completa', suggested: ['pepsi'], copy: 'Sumá tu gaseosa', ticketLevel: 'bajo', timing: 'tarde', displayLocations: { inMenu: true, inCheckout: false, inCart: true } },
    { name: 'Burger Casa + Papas', type: 'upsell', category: 'hamburguesas', trigger: 'de la casa', suggested: ['papas fritas'], copy: 'Papas para compartir', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Burger + Chocotorta', type: 'cross-sell', category: 'hamburguesas', trigger: 'completa', suggested: ['chocotorta'], copy: 'Postre para cerrar 🍫', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Burger Casa + Limonada', type: 'cross-sell', category: 'hamburguesas', trigger: 'de la casa', suggested: ['limonada'], copy: 'Refrescate', ticketLevel: 'bajo', timing: 'tarde' },

    // 🥪 SANDWICHES (7)
    { name: 'Crudo Queso + Limonada', type: 'cross-sell', category: 'sandwiches', trigger: 'de crudo y queso', suggested: ['limonada'], copy: 'Algo fresco', ticketLevel: 'bajo', timing: 'todo-el-dia' },
    { name: 'Jamón Queso + Agua', type: 'cross-sell', category: 'sandwiches', trigger: 'de jamon cocido', suggested: ['agua con y sin gas'], copy: 'Hidratate', ticketLevel: 'bajo', timing: 'todo-el-dia' },
    { name: 'Mila Simple → Mediano', type: 'upgrade', category: 'sandwiches', trigger: 'simple', suggested: ['mediano'], copy: 'Llevá más ingredientes', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Mila Mediano → Completo', type: 'upgrade', category: 'sandwiches', trigger: 'mediano', suggested: ['completo'], copy: 'Hacelo completo', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Mila Completo + Corona', type: 'cross-sell', category: 'sandwiches', trigger: 'completo', suggested: ['cerveza corona'], copy: 'El combo perfecto 🍺', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Tostado + Café', type: 'cross-sell', category: 'sandwiches', trigger: 'tostado en pan arabe', suggested: ['café con leche'], copy: 'Completá la merienda', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Tostado Completo + Licuado', type: 'cross-sell', category: 'sandwiches', trigger: 'tostado en pan arabe completo', suggested: ['durazno'], copy: 'Algo dulce', ticketLevel: 'bajo', timing: 'tarde' },

    // 🍝 NUESTROS PLATOS (12)
    { name: 'Pechuga + Agua', type: 'cross-sell', category: 'platos', trigger: 'pechuga grillada', suggested: ['agua con y sin gas'], copy: 'Liviano y fresco', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Pechuga + Ensalada Fruta', type: 'cross-sell', category: 'platos', trigger: 'pechuga grillada', suggested: ['ensalada de fruta'], copy: 'Cierre saludable', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Mila Napo + Stella 1lt', type: 'cross-sell', category: 'platos', trigger: 'napolitana', suggested: ['cerveza stella artois 1lt'], copy: 'Para compartir 🍺', ticketLevel: 'alto', timing: 'tarde' },
    { name: 'Mila Napo + Gaseosa', type: 'cross-sell', category: 'platos', trigger: 'napolitana', suggested: ['pepsi'], copy: 'Sumá tu bebida', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Pasta Cinta + Agua gas', type: 'cross-sell', category: 'platos', trigger: 'pasta en cinta', suggested: ['agua con y sin gas'], copy: 'Digestivo ideal', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Ravioles + Postre Vigilante', type: 'cross-sell', category: 'platos', trigger: 'ravioles', suggested: ['postre vigilante'], copy: 'Un clásico argentino', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Mila Deluxe + Andes 1lt', type: 'cross-sell', category: 'platos', trigger: 'milanesa deluxe', suggested: ['cerveza andes 1lt'], copy: 'Deluxe merece brindis', ticketLevel: 'alto', timing: 'tarde' },
    { name: 'Pizza Muzza + Corona', type: 'cross-sell', category: 'platos', trigger: 'pizza individual', suggested: ['cerveza corona'], copy: 'Pizza + birra 💯', ticketLevel: 'medio', timing: 'noche' },
    { name: 'Mila Pollo + Jarra Limonada', type: 'cross-sell', category: 'platos', trigger: 'milanesa de pollo', suggested: ['jarra de limonada'], copy: 'Refrescá la mesa', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Sorrentinos + Postre', type: 'cross-sell', category: 'platos', trigger: 'sorrentinos', suggested: ['postre vigilante'], copy: 'Domingo completo', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Mila Carne + Mousse', type: 'cross-sell', category: 'platos', trigger: 'milanesa carne', suggested: ['mousse de dulce de leche'], copy: 'Dulce final', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Mila Caballo + Gaseosa', type: 'cross-sell', category: 'platos', trigger: 'caballo', suggested: ['pepsi'], copy: 'Combo tradicional', ticketLevel: 'bajo', timing: 'tarde' },

    // 🥗 ENSALADAS (7)
    { name: 'Deluxe + Green', type: 'cross-sell', category: 'ensaladas', trigger: 'deluxe', suggested: ['green'], copy: '100% saludable 🌿', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Caesar + Limonada', type: 'cross-sell', category: 'ensaladas', trigger: 'caesar', suggested: ['limonada'], copy: 'Fresco y liviano', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Casa + Orange', type: 'cross-sell', category: 'ensaladas', trigger: 'de la casa', suggested: ['orange'], copy: 'Vitaminas extra 🍊', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Meeting + Agua', type: 'cross-sell', category: 'ensaladas', trigger: 'meeting', suggested: ['agua con y sin gas'], copy: 'Balance perfecto', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Gourmet + Vitality', type: 'cross-sell', category: 'ensaladas', trigger: 'gourmet', suggested: ['vitality'], copy: 'Energía natural', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Deluxe + Fruta', type: 'cross-sell', category: 'ensaladas', trigger: 'deluxe', suggested: ['ensalada de fruta'], copy: 'Cierre light', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Caesar + Ensalada Fruta', type: 'cross-sell', category: 'ensaladas', trigger: 'caesar', suggested: ['ensalada de fruta'], copy: 'Postre natural', ticketLevel: 'bajo', timing: 'tarde' },

    // 🌯 WRAPS (4)
    { name: 'Wrap Carne + Andes', type: 'cross-sell', category: 'wraps', trigger: 'carne desmechada', suggested: ['cerveza andes lata'], copy: 'Combo wrap + birra', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Wrap César + Limonada FR', type: 'cross-sell', category: 'wraps', trigger: 'cesar', suggested: ['limonada frutos rojos'], copy: 'Fresco y colorido', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Wrap César + Fruta', type: 'cross-sell', category: 'wraps', trigger: 'cesar', suggested: ['ensalada de fruta'], copy: 'Cierre light', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Wrap Carne + Chocotorta', type: 'cross-sell', category: 'wraps', trigger: 'carne desmechada', suggested: ['chocotorta'], copy: 'Un dulce final', ticketLevel: 'bajo', timing: 'tarde' },

    // 🥧 TARTAS (4)
    { name: 'Tarta JM + Licuado', type: 'cross-sell', category: 'tartas', trigger: 'jamon y muzarella', suggested: ['banana'], copy: 'Almuerzo completo', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Tarta Calabaza + Agua', type: 'cross-sell', category: 'tartas', trigger: 'cabutia', suggested: ['agua con y sin gas'], copy: 'Light y rico', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Tarta Espinaca + Green', type: 'cross-sell', category: 'tartas', trigger: 'espinaca', suggested: ['green'], copy: 'Todo verde 🌿', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Tarta JM + Cookie', type: 'cross-sell', category: 'tartas', trigger: 'jamon y muzarella', suggested: ['cookie oreo'], copy: 'Algo dulce después', ticketLevel: 'bajo', timing: 'tarde' },

    // 🧇 BIGTOAST (4)
    { name: 'BT Palta + Vitality', type: 'cross-sell', category: 'bigtoast', trigger: 'palta', suggested: ['vitality'], copy: 'Brunch saludable', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'BT Huevo + Exprimido', type: 'cross-sell', category: 'bigtoast', trigger: 'huevo revuelto', suggested: ['naranja'], copy: 'Vitamina C', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'BT Palta Huevo + Café', type: 'cross-sell', category: 'bigtoast', trigger: 'huevo revuelto y palta', suggested: ['café con leche'], copy: 'Desayuno power', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'BT Palta + Green', type: 'cross-sell', category: 'bigtoast', trigger: 'palta', suggested: ['green'], copy: 'Detox completo', ticketLevel: 'medio', timing: 'mañana' },

    // 🍟 ENTRADAS & PICADAS (8)
    { name: 'Bastones + Stella lata', type: 'cross-sell', category: 'entradas', trigger: 'bastones de muzarella', suggested: ['cerveza stella lata'], copy: 'Para picar 🍺', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Tortilla + Andes lata', type: 'cross-sell', category: 'entradas', trigger: 'tortilla de papa', suggested: ['cerveza andes lata'], copy: 'Clásico español', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Papas + Corona', type: 'cross-sell', category: 'entradas', trigger: 'papas fritas', suggested: ['cerveza corona'], copy: 'Snack + birra', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Picada + Stella 1lt', type: 'cross-sell', category: 'entradas', trigger: 'tablita de picada', suggested: ['cerveza stella artois 1lt'], copy: 'Para compartir', ticketLevel: 'alto', timing: 'tarde' },
    { name: 'Picada + Andes 1lt', type: 'cross-sell', category: 'entradas', trigger: 'tablita de picada', suggested: ['cerveza andes 1lt'], copy: 'Mesa completa', ticketLevel: 'alto', timing: 'tarde' },
    { name: 'Provoleta + Corona', type: 'cross-sell', category: 'entradas', trigger: 'provoleta', suggested: ['cerveza corona'], copy: 'Aperitivo argentino', ticketLevel: 'medio', timing: 'noche' },
    { name: 'Provoleta Casa + Limonada', type: 'cross-sell', category: 'entradas', trigger: 'provoleta de la casa', suggested: ['jarra de limonada'], copy: 'Refrescante', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Papas Rejilla + Gaseosa', type: 'cross-sell', category: 'entradas', trigger: 'papas fritas rejilla', suggested: ['pepsi'], copy: 'Snack completo', ticketLevel: 'bajo', timing: 'todo-el-dia' },

    // 🍩 COSITAS RICAS - Postres (10)
    { name: 'Roll Canela + Café', type: 'cross-sell', category: 'postres', trigger: 'roll de canela', suggested: ['café con leche'], copy: 'Merienda premium', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Chocotorta + Submarino', type: 'cross-sell', category: 'postres', trigger: 'chocotorta', suggested: ['submarino'], copy: 'Dulce explosión 🍫', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Cookie Oreo + Té', type: 'cross-sell', category: 'postres', trigger: 'cookie oreo', suggested: ['té'], copy: 'Tea time', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Pain Chocolat + Capuchino', type: 'cross-sell', category: 'postres', trigger: 'pain au chocolat', suggested: ['capuchino'], copy: 'Estilo francés', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Croissant + Jarrito', type: 'cross-sell', category: 'postres', trigger: 'croissant', suggested: ['jarrito'], copy: 'Desayuno clásico', ticketLevel: 'bajo', timing: 'mañana' },
    { name: 'Croissant JQ + Exprimido', type: 'cross-sell', category: 'postres', trigger: 'croisant con jamon', suggested: ['naranja'], copy: 'Brunch express', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Mousse + Pocillo', type: 'cross-sell', category: 'postres', trigger: 'mousse de dulce de leche', suggested: ['pocillo'], copy: 'Cierre perfecto', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Budín + Té', type: 'cross-sell', category: 'postres', trigger: 'budin de limon', suggested: ['té'], copy: 'Combo inglés', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Ensalada Fruta + Orange', type: 'cross-sell', category: 'postres', trigger: 'ensalada de fruta', suggested: ['orange'], copy: 'Todo natural', ticketLevel: 'bajo', timing: 'todo-el-dia' },
    { name: 'Postre Vigilante + Café', type: 'cross-sell', category: 'postres', trigger: 'postre vigilante', suggested: ['café doble'], copy: 'Tradición argentina', ticketLevel: 'bajo', timing: 'tarde' },

    // 🧁 MUFFINS (3)
    { name: 'Muffin Vainilla + Café', type: 'cross-sell', category: 'muffins', trigger: 'vainilla y chips', suggested: ['café con leche'], copy: 'Dulce merienda', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Muffin Chocolate + Submarino', type: 'cross-sell', category: 'muffins', trigger: 'chocolate con chips', suggested: ['submarino'], copy: 'Choco lover 🍫', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Muffin + Cookie', type: 'upsell', category: 'muffins', trigger: 'vainilla y chips', suggested: ['cookie'], copy: 'Llevá dos dulces', ticketLevel: 'bajo', timing: 'tarde' },

    // 🍪 ALFAJORES (5)
    { name: 'Carbón + Jarrito', type: 'cross-sell', category: 'alfajores', trigger: 'carbon activado', suggested: ['jarrito'], copy: 'El mejor acompañante', ticketLevel: 'bajo', timing: 'todo-el-dia' },
    { name: 'Red + Submarino', type: 'cross-sell', category: 'alfajores', trigger: 'red', suggested: ['submarino'], copy: 'Choco máximo', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Choco Negro + Café Doble', type: 'cross-sell', category: 'alfajores', trigger: 'chocolate negro', suggested: ['café doble'], copy: 'Intenso', ticketLevel: 'bajo', timing: 'mañana' },
    { name: 'Cookie Alfajor + Té', type: 'cross-sell', category: 'alfajores', trigger: 'cookie', suggested: ['té con leche'], copy: 'Dulce combo', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Maicena + Pocillo', type: 'cross-sell', category: 'alfajores', trigger: 'maicena', suggested: ['pocillo'], copy: 'Clásico argentino', ticketLevel: 'bajo', timing: 'todo-el-dia' },

    // 🍹 LICUADOS (5)
    { name: 'Banana → Multifruta', type: 'upgrade', category: 'licuados', trigger: 'banana', suggested: ['multifruta'], copy: 'Más frutas, más sabor', ticketLevel: 'bajo', timing: 'todo-el-dia' },
    { name: 'Exprimido + BT Palta', type: 'cross-sell', category: 'licuados', trigger: 'naranja', suggested: ['palta'], copy: 'Brunch fit', ticketLevel: 'medio', timing: 'mañana', displayLocations: { inMenu: true, inCheckout: true, inCart: true } },
    { name: 'Limonada → Jarra', type: 'upgrade', category: 'licuados', trigger: 'limonada', suggested: ['jarra de limonada'], copy: 'Para compartir', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Limonada FR → Jarra FR', type: 'upgrade', category: 'licuados', trigger: 'limonada frutos rojos', suggested: ['jarra de limonada de frutos rojos'], copy: 'Llevá más', ticketLevel: 'bajo', timing: 'tarde' },
    { name: 'Durazno + Bowl', type: 'cross-sell', category: 'licuados', trigger: 'durazno', suggested: ['bowl de yogurt'], copy: 'Brunch completo', ticketLevel: 'medio', timing: 'mañana' },

    // 🌿 DETOX (4)
    { name: 'Green + Bowl FR', type: 'cross-sell', category: 'detox', trigger: 'green', suggested: ['bowl de yogurt frutos rojos'], copy: 'Detox level pro', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Orange + Ensalada Fruta', type: 'cross-sell', category: 'detox', trigger: 'orange', suggested: ['ensalada de fruta'], copy: 'Todo vitaminas', ticketLevel: 'bajo', timing: 'mañana' },
    { name: 'Vitality + BT Palta', type: 'cross-sell', category: 'detox', trigger: 'vitality', suggested: ['palta'], copy: 'Energía pura', ticketLevel: 'medio', timing: 'mañana' },
    { name: 'Green + Ensalada Deluxe', type: 'cross-sell', category: 'detox', trigger: 'green', suggested: ['deluxe'], copy: 'Full healthy', ticketLevel: 'alto', timing: 'tarde' },

    // 🍺 BEBIDAS - Inversas (5)
    { name: 'Stella 1lt + Picada', type: 'cross-sell', category: 'bebidas', trigger: 'cerveza stella artois 1lt', suggested: ['tablita de picada'], copy: 'Para picar', ticketLevel: 'alto', timing: 'tarde', displayLocations: { inMenu: true, inCheckout: true, inCart: true } },
    { name: 'Andes 1lt + Papas', type: 'cross-sell', category: 'bebidas', trigger: 'cerveza andes 1lt', suggested: ['papas fritas'], copy: 'Acompañá la birra', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Corona + Provoleta', type: 'cross-sell', category: 'bebidas', trigger: 'cerveza corona', suggested: ['provoleta'], copy: 'Aperitivo ideal', ticketLevel: 'medio', timing: 'noche' },
    { name: 'Stella lata + Bastones', type: 'cross-sell', category: 'bebidas', trigger: 'cerveza stella lata', suggested: ['bastones de muzarella'], copy: 'Snack perfecto', ticketLevel: 'medio', timing: 'tarde' },
    { name: 'Gaseosa + Mila Simple', type: 'cross-sell', category: 'bebidas', trigger: 'pepsi', suggested: ['simple'], copy: 'Combo completo', ticketLevel: 'medio', timing: 'tarde' },

    // 🎯 COMBOS ESPECIALES - Categoría sin trigger específico (5)
    { name: 'Brunch Completo', type: 'combo', category: 'combos-especiales', triggerCategory: 'BigToast', suggested: ['naranja', 'café con leche'], copy: 'Todo el brunch ☀️', ticketLevel: 'alto', timing: 'mañana', displayLocations: { inMenu: true, inCheckout: false, inCart: false } },
    { name: 'After Office', type: 'combo', category: 'combos-especiales', triggerCategory: 'Entradas', suggested: ['cerveza stella artois 1lt'], copy: 'Hora de relajar 🍺', ticketLevel: 'alto', timing: 'tarde', displayLocations: { inMenu: true, inCheckout: false, inCart: false } },
    { name: 'Almuerzo Express', type: 'combo', category: 'combos-especiales', triggerCategory: 'Tartas', suggested: ['banana'], copy: 'Rápido y rico', ticketLevel: 'medio', timing: 'tarde', displayLocations: { inMenu: true, inCheckout: true, inCart: false } },
    { name: 'Merienda Clásica', type: 'combo', category: 'combos-especiales', triggerCategory: 'Cafeteria', suggested: ['roll de canela'], copy: 'Toda la mesa', ticketLevel: 'medio', timing: 'tarde', displayLocations: { inMenu: true, inCheckout: false, inCart: false } },
    { name: 'Healthy Pack', type: 'combo', category: 'combos-especiales', triggerCategory: 'Ensaladas de la Casa', suggested: ['green'], copy: 'Bienestar total 🌿', ticketLevel: 'medio', timing: 'tarde', displayLocations: { inMenu: true, inCheckout: true, inCart: false } },
];

async function seedUpsellings() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Obtener menú completo
        console.log('📋 Cargando menú...');
        const menu = await Menu.findOne().lean();
        if (!menu) {
            throw new Error('No se encontró el menú en la base de datos');
        }
        console.log(`✅ Menú cargado con ${menu.categories.length} categorías`);

        // Limpiar upsellings existentes
        console.log('🗑️  Limpiando upsellings existentes...');
        await Upselling.deleteMany({});
        console.log('✅ Upsellings anteriores eliminados');

        // Procesar cada definición
        const upsellings = [];
        let skipped = 0;
        let created = 0;

        for (const def of upsellingDefinitions) {
            // Buscar trigger item o categoría
            let triggerItem = null;
            let triggerCategory = null;

            if (def.trigger) {
                triggerItem = findItem(menu, def.trigger);
                if (!triggerItem) {
                    console.log(`⚠️  Trigger no encontrado: "${def.trigger}" (${def.name})`);
                    skipped++;
                    continue;
                }
            }

            if (def.triggerCategory) {
                triggerCategory = findCategory(menu, def.triggerCategory);
                if (!triggerCategory) {
                    console.log(`⚠️  Categoría no encontrada: "${def.triggerCategory}" (${def.name})`);
                    skipped++;
                    continue;
                }
            }

            // Buscar items sugeridos
            const suggestedItems = [];
            let allFound = true;

            for (const suggestedName of def.suggested) {
                const item = findItem(menu, suggestedName);
                if (item) {
                    suggestedItems.push({
                        itemId: item.itemId,
                        itemName: item.itemName
                    });
                } else {
                    console.log(`⚠️  Sugerido no encontrado: "${suggestedName}" (${def.name})`);
                    allFound = false;
                }
            }

            if (!allFound || suggestedItems.length === 0) {
                skipped++;
                continue;
            }

            // Crear documento de upselling
            const upselling = {
                name: def.name,
                type: def.type,
                category: def.category,
                triggerItemId: triggerItem?.itemId || null,
                triggerItemName: triggerItem?.itemName || null,
                triggerCategoryId: triggerCategory?.categoryId || null,
                triggerCategoryName: triggerCategory?.categoryName || null,
                suggestedItems,
                copyText: def.copy,
                ticketLevel: def.ticketLevel || 'medio',
                timing: def.timing || 'todo-el-dia',
                daysActive: [0, 1, 2, 3, 4, 5, 6],
                displayLocations: def.displayLocations || {
                    inMenu: false,
                    inCheckout: true,
                    inCart: true
                },
                isActive: true,
                priority: def.ticketLevel === 'alto' ? 10 : (def.ticketLevel === 'medio' ? 5 : 1),
                displayLimit: 3,
                metrics: {
                    impressions: { total: 0, inMenu: 0, inCheckout: 0, inCart: 0 },
                    clicks: { total: 0, inMenu: 0, inCheckout: 0, inCart: 0 }
                },
                locationId: null
            };

            upsellings.push(upselling);
            created++;
        }

        // Insertar todos los upsellings
        console.log(`\n📦 Insertando ${upsellings.length} upsellings...`);
        await Upselling.insertMany(upsellings);

        console.log('\n✅ ¡SEED COMPLETADO!');
        console.log(`   ✓ Creados: ${created}`);
        console.log(`   ✗ Omitidos: ${skipped}`);
        console.log(`   Total en DB: ${await Upselling.countDocuments()}`);

        // Resumen por categoría
        console.log('\n📊 RESUMEN POR CATEGORÍA:');
        const categories = [...new Set(upsellings.map(u => u.category))];
        for (const cat of categories) {
            const count = upsellings.filter(u => u.category === cat).length;
            console.log(`   ${cat}: ${count}`);
        }

    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
        process.exit(0);
    }
}

seedUpsellings();
