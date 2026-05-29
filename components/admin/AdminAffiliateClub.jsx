'use client';

import { useEffect, useState } from 'react';
import { MdAssignmentInd, MdFilterList, MdCheckCircle, MdClose, MdPerson } from 'react-icons/md';
import API_URI from '@/utils/getApiUri';

export default function AdminAffiliateClub() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '' });
    const [selectedLead, setSelectedLead] = useState(null);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);

            const res = await fetch(`${API_URI}/api/admin/affiliate-club/leads?${params}`);
            if (!res.ok) throw new Error('No se pudieron cargar los leads');
            const data = await res.json();
            setLeads(data.leads || []);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateLeadStatus = async (leadId, newStatus) => {
        try {
            const res = await fetch(`${API_URI}/api/admin/affiliate-club/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, notes })
            });
            if (!res.ok) throw new Error('No se pudo actualizar el lead');
            await fetchLeads();
            setSelectedLead(null);
            setNotes('');
        } catch (error) {
            console.error('Error updating lead:', error);
            alert('Error al actualizar el lead');
        }
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
                    <MdAssignmentInd className="text-purple-600" />
                    Leads Asignados
                </h2>
                <p className="text-gray-600 mt-1">Gestiona los prospectos asignados por el SuperAdmin</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 p-4">
                    <div className="flex items-center gap-4">
                        <MdFilterList className="text-purple-600" />
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ status: e.target.value })}
                            className="px-4 py-2 border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Todos los estados</option>
                            <option value="new">Nuevos</option>
                            <option value="contacted">Contactados</option>
                            <option value="converted">Convertidos</option>
                            <option value="lost">Perdidos</option>
                        </select>
                    </div>
                </div>

                {leads.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No hay leads asignados
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {leads.map((lead) => (
                            <div key={lead._id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <MdPerson className="text-purple-600" />
                                            <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                                lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                                lead.status === 'converted' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {lead.status === 'new' ? 'Nuevo' :
                                                 lead.status === 'contacted' ? 'Contactado' :
                                                 lead.status === 'converted' ? 'Convertido' :
                                                 'Perdido'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">{lead.email}</p>
                                        <p className="text-sm text-gray-600 mb-1">{lead.phone}</p>
                                        {lead.notes && (
                                            <p className="text-sm text-gray-500 italic">{lead.notes}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedLead(lead)}
                                        className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Gestionar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedLead && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold mb-4">Gestionar Lead: {selectedLead.name}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Estado</label>
                                <select
                                    value={selectedLead.status}
                                    onChange={(e) => setSelectedLead({ ...selectedLead, status: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="new">Nuevo</option>
                                    <option value="contacted">Contactado</option>
                                    <option value="converted">Convertido</option>
                                    <option value="lost">Perdido</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Notas</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    rows={3}
                                    placeholder="Agrega notas sobre este lead..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => updateLeadStatus(selectedLead._id, selectedLead.status)}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    Guardar
                                </button>
                                <button
                                    onClick={() => { setSelectedLead(null); setNotes(''); }}
                                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
