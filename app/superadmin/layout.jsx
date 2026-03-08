import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MdDashboard, MdLocationOn, MdPeople, MdBarChart, MdLogout, MdInsights, MdReceipt } from 'react-icons/md';
import { isSuperAdmin } from '@/middleware/superadmin';
import PoweredByTakeasy from '@/components/footer/PoweredByTakeasy';
import SuperAdminHelpButton from '@/components/help/SuperAdminHelpButton';

export default async function SuperAdminLayout({ children }) {
    const session = await auth();

    // SECURITY: Verificar autenticación y whitelist (no confiar solo en rol DB)
    if (!session || !(await isSuperAdmin(session))) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <MdBarChart className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">SuperAdmin Panel</h1>
                                <p className="text-sm text-purple-100">Sistema de control maestro</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-purple-100">
                                {session.user.name || session.user.email}
                            </span>
                            <SuperAdminHelpButton />
                            <Link
                                href="/api/auth/signout"
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <MdLogout className="w-4 h-4" />
                                <span className="text-sm">Salir</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-1">
                        <NavLink href="/superadmin" icon={MdDashboard}>
                            Dashboard
                        </NavLink>
                        <NavLink href="/superadmin/locations" icon={MdLocationOn}>
                            Locaciones
                        </NavLink>
                        <NavLink href="/superadmin/customers" icon={MdPeople}>
                            Clientes
                        </NavLink>
                        <NavLink href="/superadmin/analytics" icon={MdBarChart}>
                            Analytics
                        </NavLink>
                        <NavLink href="/superadmin/orders" icon={MdReceipt}>
                            Ordenes
                        </NavLink>
                        <NavLink href="/superadmin/ico" icon={MdInsights}>
                            ICO
                        </NavLink>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* TakeasyGO Footer */}
            <footer className="flex items-center justify-center py-4 border-t border-gray-200 bg-white mt-8">
                <PoweredByTakeasy variant="light" label="network" />
            </footer>
        </div>
    );
}

function NavLink({ href, icon: Icon, children }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 border-b-2 border-transparent hover:border-purple-600 transition-all"
        >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{children}</span>
        </Link>
    );
}
