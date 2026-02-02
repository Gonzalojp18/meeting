'use client';
import React, { useState, useEffect } from 'react';
import { MdRefresh, MdSearch, MdHistory, MdPrint, MdCheckCircle, MdError, MdVisibility, MdDelete, MdClose } from 'react-icons/md';
import { useSession } from 'next-auth/react';

const TicketHistory = ({ locations = [] }) => {
    const { data: session } = useSession();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedLocation, setSelectedLocation] = useState(locations[0]?.nameId || '');

    useEffect(() => {
        if (!selectedLocation && locations.length > 0) {
            setSelectedLocation(locations[0].nameId);
        }
    }, [locations]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        if (selectedLocation) {
            fetchOrders();
        }
    }, [filterDate, selectedLocation]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/orders?date=${filterDate}&locationId=${selectedLocation}`);
            const data = await res.json();
            setOrders(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReprint = async (orderId, type = 'kitchen') => {
        setMessage({ type: 'info', text: `Enviando a cola de impresión (${type})...` });
        try {
            const res = await fetch(`/api/admin/printers?action=reprint&orderId=${orderId}&type=${type}`);
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Ticket enviado correctamente.' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Error al re-imprimir.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de red al re-imprimir.' });
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!confirm('¿Seguro que deseas eliminar este ticket permanentemente? Esta acción es irreversible.')) return;

        try {
            const res = await fetch(`/api/admin/orders?id=${orderId}`, { method: 'DELETE' });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Ticket eliminado correctamente.' });
                fetchOrders();
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Error al eliminar.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de red al intentar eliminar.' });
        }
    };

    const filteredOrders = orders.filter(order => {
        const query = searchTerm.toLowerCase();
        const name = `${order.customer?.name || ''} ${order.customer?.lastname || ''}`.toLowerCase();
        const orderNum = (order.orderNumber || '').toLowerCase();
        return name.includes(query) || orderNum.includes(query);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MdHistory className="h-6 w-6 text-indigo-600" />
                        Tickets
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sede Actual:</span>
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="text-xs font-bold text-indigo-600 bg-indigo-50 border-none rounded-lg py-1 px-2 focus:ring-0 cursor-pointer hover:bg-indigo-100 transition-colors"
                        >
                            {locations.map(loc => (
                                <option key={loc.nameId} value={loc.nameId}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por orden o cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
                    message.type === 'info' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    {message.type === 'success' ? <MdCheckCircle className="h-5 w-5" /> : <MdError className="h-5 w-5" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Orden</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo Ticket</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Total</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Sede</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.flatMap((order) => {
                                    // Flatten: One row per print history item, or fallback to one row per order
                                    if (order.printHistory?.length > 0) {
                                        return order.printHistory.map((ph, idx) => ({
                                            ...order,
                                            uniqueKey: `${order._id}_${idx}`,
                                            displayRole: ph.role,
                                            displayStatus: ph.status,
                                            displayTimestamp: ph.timestamp || order.createdAt
                                        }));
                                    }
                                    return [{
                                        ...order,
                                        uniqueKey: order._id,
                                        displayRole: null,
                                        displayStatus: order.printStatus?.printed ? 'success' : 'pending',
                                        displayTimestamp: order.createdAt
                                    }];
                                }).map((row) => (
                                    <tr key={row.uniqueKey} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs font-bold text-gray-900">{row.orderNumber}</span>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {new Date(row.displayTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${row.displayRole === 'cashier' ? 'bg-blue-50 text-blue-600' :
                                                    row.displayRole === 'kitchen' ? 'bg-orange-50 text-orange-600' :
                                                        'bg-gray-100 text-gray-500'
                                                }`}>
                                                {row.displayRole === 'cashier' ? 'Caja' :
                                                    row.displayRole === 'kitchen' ? 'Cocina' :
                                                        'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-gray-700">{row.customer?.name} {row.customer?.lastname}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-xs text-gray-900">
                                            ${row.total?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {row.location?.locationName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 w-fit ${row.displayStatus === 'success' ? 'bg-emerald-100 text-emerald-700' :
                                                    row.displayStatus === 'pending' ? 'bg-gray-100 text-gray-500' :
                                                        'bg-rose-100 text-rose-700'
                                                }`}>
                                                {row.displayStatus === 'success' ? 'Exitoso' :
                                                    row.displayStatus === 'pending' ? 'Pendiente' : 'Error'}
                                                {row.displayStatus === 'error' && '!'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end items-center gap-2">
                                                <button
                                                    onClick={() => handleReprint(row._id, row.displayRole || 'kitchen')}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100"
                                                    title={`Re-imprimir ticket de ${row.displayRole || 'Cocina'}`}
                                                >
                                                    <MdPrint className="h-3 w-3" /> Re-imprimir
                                                </button>

                                                {session?.user?.role === 'admin' && (
                                                    <button
                                                        onClick={() => handleDeleteOrder(row._id)}
                                                        className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100"
                                                        title="Eliminar Orden"
                                                    >
                                                        <MdDelete className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center text-gray-400 italic text-sm">
                                        No se encontraron órdenes para esta fecha.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TicketHistory;
