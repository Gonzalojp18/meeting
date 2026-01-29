import {
    MdHome,
    MdRestaurantMenu,
    MdGrass,
    MdRestaurant,
    MdLunchDining,
    MdFreeBreakfast,
    MdCake,
    MdLocalCafe,
    MdBakeryDining,
    MdLocalDrink,
    MdHelp,
    MdFastfood,
    MdEco,
    MdLocalPizza
} from 'react-icons/md';

const CategoryIcons = {
    Inicio: MdHome,
    Entradas: MdRestaurantMenu,
    Ensaladas: MdGrass,
    Platos: MdRestaurant,
    Sandwiches: MdLunchDining,
    Desayunos: MdFreeBreakfast,
    Postres: MdCake,
    Cafe: MdLocalCafe,
    Bakery: MdBakeryDining,
    Bebidas: MdLocalDrink,
    FastFood: MdFastfood,
    Detox: MdEco,
    Default: MdHelp
};

export const getCategoryIcon = (categoryName) => {
    if (!categoryName) return <CategoryIcons.Default size={24} />;

    const name = categoryName.toLowerCase().trim();

    // Mapping based on keywords to handle "Desayunos & Meriendas", etc.
    if (name.includes('inicio')) return <CategoryIcons.Inicio size={24} />;

    if (name.includes('entrada') || name.includes('picada')) return <CategoryIcons.Entradas size={24} />;

    if (name.includes('ensalada')) return <CategoryIcons.Ensaladas size={24} />;

    if (name.includes('plato')) return <CategoryIcons.Platos size={24} />;

    if (name.includes('hamburguesa')) return <CategoryIcons.Sandwiches size={24} />;

    if (name.includes('sandwich') || name.includes('wrap')) return <CategoryIcons.FastFood size={24} />;

    if (name.includes('tarta') || name.includes('quiche')) return <MdLocalPizza size={24} />;

    if (name.includes('toast') || name.includes('tostado') || name.includes('tostón') || name.includes('toston')) return <CategoryIcons.Bakery size={24} />;

    if (name.includes('desayuno') || name.includes('merienda')) return <CategoryIcons.Desayunos size={24} />;

    if (name.includes('postre') || name.includes('torta') || name.includes('dulce') || name.includes('cosita') || name.includes('muffin') || name.includes('alfajor')) return <CategoryIcons.Postres size={24} />;

    if (name.includes('cafe') || name.includes('cafetería') || name.includes('cafeteria')) return <CategoryIcons.Cafe size={24} />;

    if (name.includes('bakery') || name.includes('panadería') || name.includes('panaderia') || name.includes('panificado')) return <CategoryIcons.Bakery size={24} />;

    if (name.includes('bebida') || name.includes('jugo') || name.includes('licuado') || name.includes('exprimido') || name.includes('smoothie')) return <CategoryIcons.Bebidas size={24} />;

    if (name.includes('detox')) return <CategoryIcons.Detox size={24} />;

    return <CategoryIcons.Default size={24} />;
};

export default CategoryIcons;

