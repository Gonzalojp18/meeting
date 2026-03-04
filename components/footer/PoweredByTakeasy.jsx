import Image from 'next/image';
import Link from 'next/link';

/**
 * PoweredByTakeasy
 * Firma de red TakeasyGO — aparece en todas las vistas del producto.
 *
 * @param {'dark' | 'light'} variant  - dark: fondos oscuros | light: fondos claros
 * @param {'powered' | 'network'} label - powered: "Powered by" | network: "Parte de la red"
 */
const PoweredByTakeasy = ({ variant = 'dark', label = 'network' }) => {
    const textClass = variant === 'dark'
        ? 'text-gray-400 hover:text-gray-200'
        : 'text-gray-500 hover:text-gray-700';

    const borderClass = variant === 'dark'
        ? 'border-gray-700'
        : 'border-gray-200';

    const labelText = label === 'powered' ? 'Powered by' : 'Parte de la red';

    return (
        <Link
            href="https://www.takeasygo.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`
                inline-flex items-center gap-2 group transition-all duration-300
                px-3 py-1.5 rounded-full border ${borderClass}
                hover:border-orange-500/40 hover:shadow-sm
            `}
            aria-label="TakeasyGO - Plataforma de gestión gastronómica"
        >
            <span className={`text-xs font-light tracking-wide transition-colors duration-300 ${textClass}`}>
                {labelText}
            </span>
            <Image
                src="https://res.cloudinary.com/dt6iu9m9f/image/upload/v1772059496/logo-removebg-preview_1_yamzfc.png"
                alt="TakeasyGO"
                width={80}
                height={22}
                className="object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                style={{ width: 'auto', height: '18px' }}
                unoptimized
            />
        </Link>
    );
};

export default PoweredByTakeasy;
