// Category Styles - Sober, Modern, Compact Design
// Brand Colors: Black & White with Orange accents

export const defaultStyles = {
    container: "container-default mb-6 p-4 rounded-xl bg-gray-50 border border-gray-400",
    title: "text-4xl font-bold mb-6 text-left tracking-tight text-[#4E5F55]",
    subtitle: "text-base text-left text-gray-600 mb-4 font-normal",
    grid: "grid md:grid-cols-2 gap-3",
    item: "flex justify-between items-start py-3 px-2 border-b border-gray-200 hover:bg-gray-50 transition-colors",
    itemName: "text-lg font-bold text-gray-900 pr-4",
    itemDescription: "text-sm text-gray-600 mt-1 leading-snug",
    price: "text-lg font-bold text-[#5F6B0a] flex-shrink-0",
    image: {
        container: "overflow-hidden rounded-lg container-img ",
        img: "w-full object-cover",
        top: "mb-4 m-auto",
        bottom: "mt-4",
        "beside-title": "img-default w-32 h-32 rounded-lg object-cover",
    },
};

export const compactStyles = {
    container: "container-compact mb-6 p-5 rounded-xl bg-gray-900 border border-gray-400",
    title: "text-4xl font-bold mb-6 text-left tracking-tight text-orange-200",
    subtitle: "text-base text-left text-gray-400 mb-4 font-normal",
    grid: "grid md:grid-cols-3 gap-2",
    item: "flex justify-between items-start py-3 px-2 border-b border-gray-200 hover:bg-gray-800 transition-colors",
    itemName: "text-base font-bold text-white pr-4",
    itemDescription: "text-sm text-gray-400 mt-1 leading-snug",
    price: "text-lg font-bold text-amber-300 flex-shrink-0",
    image: {
        container: "overflow-hidden rounded-lg ",
        img: "w-full h-36 object-cover",
        top: "mb-4",
        bottom: "mt-4",
        "beside-title": "w-28 h-28  object-cover",
    },
};

export const featuredStyles = {
    container: "container-featured mb-6 p-4 rounded-xl bg-white border-2 border-gray-400",
    title: "text-5xl font-bold text-left tracking-tight text-[#4A3A2A] mb-6 w-full",
    subtitle: "text-base text-left text-gray-600 mb-4",
    grid: "grid md:grid-cols-2 gap-4",
    item: "flex justify-between items-start p-3 rounded-lg bg-white border border-gray-200  hover:border-orange-600 hover transition-all",
    itemName: "text-lg font-bold text-gray-900 pr-4",
    itemDescription: "text-sm text-gray-600 mt-2 leading-snug",
    price: "text-xl font-bold text-[#4E6b33] flex-shrink-0",
    image: {
        container: "rounded-lg overflow-hidden",
        img: "w-full h-56 object-cover",
        top: "img-featured mb-6",
        bottom: "mt-6",
        "beside-title": "rounded-lg object-cover img-featured-beside w-36 h-36",
    },
};
