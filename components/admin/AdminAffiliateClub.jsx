'use client';

import { useEffect, useState } from 'react';
import { MdAssignmentInd, MdFilterList, MdCheckCircle, MdClose, MdPerson, MdBusiness } from 'react-icons/md';
import API_URI from '@/utils/getApiUri';

export default function AdminAffiliateClub({ selectedLocation, locations }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '' });
    const [selectedLead, setSelectedLead] = useState(null);
    const [notes, setNotes] = useState('');

    // Verificar si la funcionalidad está habilitada por el superadmin
    const currentLocation = locations?.find(loc => loc.nameId === selectedLocation);
    const isFeatureEnabled = currentLocation?.features?.affiliateClubEnabled ?? false;

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);

            const res = await fetch(`${API_URI}/api/admin/affiliate-club/leads?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
            }
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLead = async () => {
        if (!selectedLead) return;

        try {
            const res = await fetch(`${API_URI}/api/admin/affiliate-club/leads`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prospectId: selectedLead._id,
                    status: selectedLead.status,
                    notes: notes
                })
            });

            if (res.ok) {
                setSelectedLead(null);
                setNotes('');
                fetchLeads();
            }
        } catch (error) {
            console.error('Error updating lead:', error);
        }
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

    if (!isFeatureEnabled) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-3xl flex items-center justify-center mb-6">
                    <MdBusiness className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Funcionalidad Premium</h3>
                <p className="text-gray-600 mb-6 max-w-md">
                    El Club de Afiliados no está habilitado para esta sede. Contacta al SuperAdmin para activar esta funcionalidad.
                </p>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 max-w-sm">
                    <p className="text-xs text-purple-700 font-medium">
                        Esta funcionalidad requiere activación por parte del SuperAdmin en el panel de gestión de sedes.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <MdAssignmentInd className="text-purple-600" />
                    Leads Asignados
                </h2>
                <p className="text-gray-600 mt-1">Gestiona los prospectos asignados por el SuperAdmin</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex gap-4 mb-6">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">Todos los estados</option>
                        <option value="new">Nuevo</option>
                        <option value="contacted">Contactado</option>
                        <option value="converted">Convertido</option>
                        <option value="lost">Perdido</option>
                    </select>

                    <button
                        onClick={fetchLeads}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                        <MdFilterList />
                        Filtrar
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left p-3">Nombre</th>
                                <th className="text-left p-3">Empresa</th>
                                <th className="text-left p-3">Teléfono</th>
                                <th className="text-left p-3">Estado</th>
                                <th className="text-left p-3">Código</th>
                                <th className="text-left p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map(lead => (
                                <tr key={lead._id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-3">
                                        <div>
                                            <p className="font-medium">{lead.name}</p>
                                            <p className="text-xs text-gray-500">{lead.email}</p>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div>
                                            <p>{lead.company}</p>
                                            <p className="text-xs text-gray-500">{lead.position}</p>
                                        </div>
                                    </td>
                                    <td className="p-3">{lead.phone}</td>
                                    <td className="p-3">{getStatusBadge(lead.status)}</td>
                                    <td className="p-3">
                                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{lead.discountCode}</code>
                                    </td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => {
                                                setSelectedLead(lead);
                                                setNotes(lead.notes || '');
                                            }}
                                            className="text-purple-600 hover:text-purple-800"
                                        >
                                            <MdPerson size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {leads.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <MdAssignmentInd className="w-12 h-12 mx-auto mb-2" />
                            <p>No hay leads asignados</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedLead && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Gestionar Lead</h3>
                            <button onClick={() => setSelectedLead(null)}>
                                <MdClose size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-500">Nombre</p>
                                <p className="font-medium">{selectedLead.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Empresa</p>
                                <p className="font-medium">{selectedLead.company}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Código de Descuento</p>
                                <p className="font-mono bg-gray-100 px-2 py-1 rounded">{selectedLead.discountCode}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Estado</label>
                                <select
                                    value={selectedLead.status}
                                    onChange={(e) => setSelectedLead({ ...selectedLead, status: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="new">Nuevo</option>
                                    <option value="contacted">Contactado</option>
                                    <option value="converted">Convertido</option>
                                    <option value="lost">Perdido</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Notas</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    rows="3"
                                    placeholder="Agregar notas de seguimiento..."
                                />
                            </div>

                            <button
                                onClick={handleUpdateLead}
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
