'use client';

import { useEffect, useState } from 'react';
import { MdBusiness, MdFilterList, MdDownload, MdPerson, MdCheckCircle, MdClose, MdAssignmentInd } from 'react-icons/md';
import API_URI from '@/utils/getApiUri';

export default function SuperAdminAffiliateClub() {
    const [prospects, setProspects] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        locationId: '',
        assignedTo: ''
    });
    const [selectedProspect, setSelectedProspect] = useState(null);
    const [admins, setAdmins] = useState([]);
    const [assignData, setAssignData] = useState({
        status: '',
        assignedTo: '',
        notes: ''
    });

    useEffect(() => {
        fetchAll();
        fetchAdmins();
    }, []);

    const fetchAll = async () => {
        await Promise.all([fetchProspects(), fetchStats()]);
    };

    const fetchProspects = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.locationId) params.append('locationId', filters.locationId);
            if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);

            const res = await fetch(`${API_URI}/api/superadmin/affiliate-club/prospects?${params}`);
            if (res.ok) {
                const data = await res.json();
                setProspects(data.prospects || []);
            }
        } catch (error) {
            console.error('Error fetching prospects:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URI}/api/superadmin/affiliate-club/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchAdmins = async () => {
        try {
            const res = await fetch(`${API_URI}/api/admin/users`);
            if (res.ok) {
                const data = await res.json();
                const adminsList = Array.isArray(data) ? data.filter(u => u.role === 'admin') : [];
                setAdmins(adminsList);
            }
        } catch (error) {
            console.error('Error fetching admins:', error);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value });
    };

    const applyFilters = () => {
        setLoading(true);
        fetchProspects();
    };

    const handleUpdateProspect = async () => {
        if (!selectedProspect) return;

        try {
            const updateData = {};
            if (assignData.status) updateData.status = assignData.status;
            if (assignData.assignedTo !== undefined) updateData.assignedTo = assignData.assignedTo;
            if (assignData.notes !== undefined) updateData.notes = assignData.notes;

            const res = await fetch(`${API_URI}/api/superadmin/affiliate-club/prospects`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prospectId: selectedProspect._id,
                    ...updateData
                })
            });

            if (res.ok) {
                setSelectedProspect(null);
                setAssignData({ status: '', assignedTo: '', notes: '' });
                fetchProspects();
                fetchStats();
            }
        } catch (error) {
            console.error('Error updating prospect:', error);
        }
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.locationId) params.append('locationId', filters.locationId);

        window.open(`${API_URI}/api/superadmin/affiliate-club/export?${params}`, '_blank');
    };

    const getStatusBadge = (status) => {
        const styles = {
            new: 'bg-blue-100 text-blue-800',
            contacted: 'bg-yellow-100 text-yellow-800',
            converted: 'bg-green-100 text-green-800',
            lost: 'bg-red-100 text-red-800'
        };
        const labels = {
            new: 'Nuevo',
            contacted: 'Contactado',
            converted: 'Convertido',
            lost: 'Perdido'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <MdBusiness className="text-purple-600" />
                    Club de Afiliados
                </h2>
                <p className="text-gray-600 mt-1">Gestión de prospectos y leads B2B</p>
            </div>

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500">Total Prospectos</p>
                        <p className="text-3xl font-bold text-purple-600">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500">Convertidos</p>
                        <p className="text-3xl font-bold text-green-600">{stats.converted || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500">Tasa Conversión</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.conversionRate}%</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500">Descuentos Usados</p>
                        <p className="text-3xl font-bold text-orange-600">{stats.usedDiscounts || 0}</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4 mb-6">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">Todos los estados</option>
                        <option value="new">Nuevo</option>
                        <option value="contacted">Contactado</option>
                        <option value="converted">Convertido</option>
                        <option value="lost">Perdido</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Filtrar por sede"
                        value={filters.locationId}
                        onChange={(e) => handleFilterChange('locationId', e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                    />

                    <button
                        onClick={applyFilters}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                        <MdFilterList />
                        Filtrar
                    </button>

                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 ml-auto"
                    >
                        <MdDownload />
                        Exportar Excel
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left p-3">Nombre</th>
                                <th className="text-left p-3">Empresa</th>
                                <th className="text-left p-3">Teléfono</th>
                                <th className="text-left p-3">Sede</th>
                                <th className="text-left p-3">Estado</th>
                                <th className="text-left p-3">Código</th>
                                <th className="text-left p-3">Asignado a</th>
                                <th className="text-left p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prospects.map(p => (
                                <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-3">
                                        <div>
                                            <p className="font-medium">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.email}</p>
                                        </div>
                                    </td>
                                    <td className="p-3">{p.company}</td>
                                    <td className="p-3">{p.phone}</td>
                                    <td className="p-3">{p.locationId}</td>
                                    <td className="p-3">{getStatusBadge(p.status)}</td>
                                    <td className="p-3">
                                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{p.discountCode}</code>
                                    </td>
                                    <td className="p-3">{p.assignedTo || '-'}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => {
                                                setSelectedProspect(p);
                                                setAssignData({
                                                    status: p.status,
                                                    assignedTo: p.assignedTo || '',
                                                    notes: p.notes || ''
                                                });
                                            }}
                                            className="text-purple-600 hover:text-purple-800"
                                        >
                                            <MdAssignmentInd size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {prospects.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <MdBusiness className="w-12 h-12 mx-auto mb-2" />
                            <p>No hay prospectos registrados</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedProspect && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Gestionar Prospecto</h3>
                            <button onClick={() => setSelectedProspect(null)}>
                                <MdClose size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-500">Nombre</p>
                                <p className="font-medium">{selectedProspect.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Empresa</p>
                                <p className="font-medium">{selectedProspect.company}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Estado</label>
                                <select
                                    value={assignData.status}
                                    onChange={(e) => setAssignData({ ...assignData, status: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="new">Nuevo</option>
                                    <option value="contacted">Contactado</option>
                                    <option value="converted">Convertido</option>
                                    <option value="lost">Perdido</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Asignar a Admin</label>
                                <select
                                    value={assignData.assignedTo}
                                    onChange={(e) => setAssignData({ ...assignData, assignedTo: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">Sin asignar</option>
                                    {admins.map(admin => (
                                        <option key={admin._id} value={admin.email}>
                                            {admin.name} ({admin.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Notas</label>
                                <textarea
                                    value={assignData.notes}
                                    onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    rows="3"
                                />
                            </div>

                            <button
                                onClick={handleUpdateProspect}
                                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
