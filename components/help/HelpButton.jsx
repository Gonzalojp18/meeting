'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import HelpCenter from './HelpCenter';
import { MdHelpOutline } from 'react-icons/md';

/**
 * HelpButton — botón "?" que abre el modal del Centro de Ayuda.
 *
 * Props:
 *   variant: 'icon' (default) | 'ghost' — estilo del botón
 *   className: clases adicionales para el botón
 *
 * Lee el rol directamente de la sesión de NextAuth.
 */
export default function HelpButton({ variant = 'icon', className = '' }) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);

    const role = session?.user?.role;

    // No mostrar si no hay sesión o el rol no es reconocido
    if (!role) return null;

    const baseStyles = variant === 'ghost'
        ? `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-all 
       text-gray-500 hover:text-gray-700 hover:bg-gray-100 ${className}`
        : `p-2 rounded-xl transition-all text-gray-400 hover:text-gray-700 hover:bg-gray-100 ${className}`;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={baseStyles}
                title="Centro de Ayuda"
                aria-label="Abrir Centro de Ayuda"
            >
                <MdHelpOutline className="w-5 h-5" />
                {variant === 'ghost' && <span>Ayuda</span>}
            </button>

            <HelpCenter
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                role={role}
            />
        </>
    );
}
