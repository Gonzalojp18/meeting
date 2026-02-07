'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MdHome, MdReceipt, MdPerson } from 'react-icons/md';

const navItems = [
    {
        href: '/',
        label: 'Home',
        icon: MdHome,
    },
    {
        href: '/my-orders',
        label: 'Mis Pedidos',
        icon: MdReceipt,
    },
    {
        href: '/login',
        label: 'Perfil',
        icon: MdPerson,
    },
];

const BottomNav = () => {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-pb">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                    ? 'text-orange-600'
                                    : 'text-gray-500 hover:text-orange-500'
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                            <span className={`text-xs mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
