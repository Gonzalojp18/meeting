import { useState, useEffect } from 'react';

const DAILY_PROMOTIONS = {
    1: { // Monday - Gris claro minimalista
        title: "Comienza tu semana con opciones frescas y deliciosas",
        description: "Disfruta los lunes con una selección única que combina sabores tradicionales y opciones saludables. Perfecto para empezar la semana con energía y buen gusto.",
        icon: "🌟",
        styles: {
            background: "bg-gradient-to-br from-gray-100 via-white to-gray-50",
            textColor: "text-gray-900",
            buttonClass: "bg-gray-900 text-white hover:bg-gray-800",
            iconBackground: "bg-gray-200",
            border: "border-2 border-gray-300",
            accentColor: "text-orange-600"
        }
    },
    2: { // Tuesday - Negro elegante con acento blanco
        title: "Sabores reconfortantes para un martes inolvidable",
        description: "Relájate y disfruta los martes con platos pensados para reconfortarte, con combinaciones ideales para todos los gustos. Una experiencia de sabor que no querrás perderte.",
        icon: "🍝",
        styles: {
            background: "bg-gradient-to-br from-black via-gray-900 to-black",
            textColor: "text-white",
            buttonClass: "bg-white text-black hover:bg-gray-100",
            iconBackground: "bg-gray-800",
            border: "border-2 border-gray-700",
            accentColor: "text-orange-300"
        }
    },
    3: { // Wednesday - Blanco con bordes negros (alto contraste)
        title: "Mitad de semana con opciones irresistibles",
        description: "Llega al miércoles con opciones llenas de frescura y creatividad, diseñadas para alegrar tu día. Platos variados y balanceados que te sorprenderán.",
        icon: "👨‍🍳",
        styles: {
            background: "bg-white",
            textColor: "text-black",
            buttonClass: "bg-[#4E5F55] text-white hover:bg-gray-900",
            iconBackground: "bg-gray-500",
            border: "border-4 border-black",
            accentColor: "text-orange-500"
        }
    },
    4: { // Thursday - Gris medio sofisticado
        title: "Un jueves lleno de tradición y buen sabor",
        description: "Vive la experiencia de un jueves delicioso con platos que combinan tradición y creatividad. Perfectos para cerrar la semana laboral con una sonrisa.",
        icon: "🥤",
        styles: {
            background: "bg-gradient-to-br from-gray-600 via-gray-500 to-gray-600",
            textColor: "text-white",
            buttonClass: "bg-[#4E5F55] text-white hover:bg-orange-700",
            iconBackground: "bg-gray-700",
            border: "border-2 border-gray-400",
            accentColor: "text-orange-400"
        }
    },
    5: { // Friday - Negro profundo con naranja vibrante
        title: "El viernes sabe mejor con opciones como estas",
        description: "Termina la semana con estilo disfrutando de un menú que celebra el buen gusto. Perfecto para compartir y empezar el fin de semana de la mejor manera.",
        icon: "🎉",
        styles: {
            background: "bg-gradient-to-br from-gray-950 via-black to-gray-950",
            textColor: "text-gray-100",
            buttonClass: "bg-[#4E5F55] text-white hover:from-orange-700 hover:to-orange-600",
            iconBackground: "bg-gray-900",
            border: "border-2 border-[#4E5F55]",
            accentColor: "text-[#4E5F55]"
        }
    }
};

export const useDailyPromotion = () => {
    const [currentDay, setCurrentDay] = useState(new Date().getDay());
    const [isWeekday, setIsWeekday] = useState(currentDay > 0 && currentDay < 6);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const day = now.getDay();
            setCurrentDay(day);
            setIsWeekday(day > 0 && day < 6);
        }, 1000 * 60); // Check every minute

        return () => clearInterval(timer);
    }, []);

    return {
        isWeekday,
        promotion: DAILY_PROMOTIONS[currentDay],
        styles: DAILY_PROMOTIONS[currentDay]?.styles || {}
    };
};