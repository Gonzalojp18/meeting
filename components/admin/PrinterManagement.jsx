'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MdPrint, MdSearch, MdAdd, MdDelete, MdCheckCircle, MdError, MdRefresh, MdDns, MdClose } from 'react-icons/md';

const PrinterManagement = ({ locations = [] }) => {
    const [printers, setPrinters] = useState([]);
    const [foundDevices, setFoundDevices] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState(null);
    const [testRoles, setTestRoles] = useState(['kitchen']);

    const [selectedLocation, setSelectedLocation] = useState('');

    // Estado para el formulario
    const [formData, setFormData] = useState({
        name: '', uid: '', ip: '', port: 9100, baudRate: 38400, connectionType: 'network', paperWidth: 80, roles: ['kitchen'], locationId: ''
    });

    const formRef = useRef(null);

    // Scroll automático al formulario cuando se abre (editar o crear)
    useEffect(() => {
        if ((isAdding || editingPrinter) && formRef.current) {
            // Timeout para asegurar que el renderizado y la animación inicial no interfieran
            setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [isAdding, editingPrinter]);

    useEffect(() => {
        if (locations.length > 0) {
            const firstLoc = locations[0].nameId;
            if (!selectedLocation) {
                setSelectedLocation(firstLoc);
                setFormData(prev => ({ ...prev, locationId: firstLoc }));
            }
        }
    }, [locations]);

    useEffect(() => {
        if (!selectedLocation) return;

        let isMounted = true;

        // Función wrapper para manejar el montaje
        const safeFetch = () => {
            if (isMounted) fetchPrinters();
        };

        // Primera carga
        safeFetch();

        // Polling para estados en tiempo real (cada 5 segundos para reducir carga)
        const interval = setInterval(safeFetch, 30000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [selectedLocation]);

    const fetchPrinters = async () => {
        // No ponemos loading(true) en cada poll para evitar parpadeos
        try {
            const res = await fetch(`/api/admin/printers?locationId=${selectedLocation}`);
            const data = await res.json();
            setPrinters(data);
        } catch (error) {
            console.error('Error fetching printers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async () => {
        setScanning(true);
        setFoundDevices([]);
        setMessage({ type: 'info', text: 'Escaneando dispositivos y resolviendo identidades...' });
        try {
            const res = await fetch(`/api/admin/printers?action=scan&locationId=${selectedLocation}`);
            const found = await res.json();

            // Filtrar dispositivos que ya están vinculados (por UID)
            const linkedUids = printers.map(p => p.uid);
            const newDevices = found.filter(d => !linkedUids.includes(d.uid));

            setFoundDevices(newDevices);

            if (found.length > 0) {
                if (newDevices.length > 0) {
                    setMessage({ type: 'success', text: `¡Se encontraron ${newDevices.length} dispositivo(s) nuevo(s)! Las ya vinculadas se actualizaron automáticamente.` });
                } else {
                    setMessage({ type: 'success', text: 'No hay dispositivos nuevos, pero tus impresoras guardadas han sido actualizadas.' });
                }
                fetchPrinters();
            } else {
                setMessage({ type: 'error', text: 'No se encontraron impresoras activas en la red.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error durante el escaneo.' });
        } finally {
            setScanning(false);
        }
    };

    const handleManualAdd = () => {
        setFormData({
            name: '',
            uid: '',
            ip: '',
            port: 9100,
            baudRate: 38400,
            connectionType: 'network',
            paperWidth: 80,
            roles: ['kitchen'],
            locationId: selectedLocation
        });
        setIsAdding(true);
        setEditingPrinter(null);
        setMessage(null);
    };

    const handleQuickAdd = (device) => {
        setFormData({
            ...formData,
            uid: device.uid,
            ip: device.ip,
            port: device.port || 9100,
            baudRate: 38400,
            connectionType: 'network',
            name: device.name || `Impresora (${device.ip})`,
            locationId: selectedLocation
        });
        setIsAdding(true);
        setEditingPrinter(null);
        setMessage(null);
    };

    const handleEditRoles = (printer) => {
        setEditingPrinter(printer);
        setFormData({ ...printer });
        setIsAdding(false);
        setMessage(null);
    };

    const handleTestConnection = async (id) => {
        try {
            setMessage({ type: 'info', text: 'Validando conexión...' });
            const res = await fetch(`/api/admin/printers?action=test&id=${id}`);
            const data = await res.json();
            if (data.status === 'online') {
                setMessage({ type: 'success', text: '¡Conexión exitosa! La impresora está lista.' });
            } else {
                setMessage({ type: 'error', text: 'La impresora no responde. Verifica que esté encendida.' });
            }
            fetchPrinters();
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al probar la conexión.' });
        }
    };

    const handleTestPrint = async (printerId, roles = []) => {
        setMessage({ type: 'info', text: 'Enviando tique de prueba...' });
        try {
            let url = `/api/admin/printers?action=test_print&locationId=${selectedLocation}`;
            if (printerId) url += `&printerId=${printerId}`;
            if (roles.length > 0) url += `&roles=${roles.join(',')}`;

            const res = await fetch(url);
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: `Prueba enviada con éxito (${data.totalSent || 1} tique[s]). Verifica la impresora física.` });
            } else {
                setMessage({ type: 'error', text: data.error || 'Error al enviar la prueba de impresión.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de red en la prueba.' });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const isEditing = !!editingPrinter;
        const url = isEditing ? `/api/admin/printers/${editingPrinter._id}` : '/api/admin/printers';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            // Generar UID automático si es manual
            const payload = { ...formData };
            if (payload.connectionType === 'usb' && !payload.uid) {
                payload.uid = `usb-${payload.port}-${Date.now().toString().slice(-4)}`;
            } else if (!payload.uid && payload.ip) {
                payload.uid = `manual-${payload.ip.replace(/\./g, '-')}-${Date.now().toString().slice(-4)}`;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setMessage({ type: 'success', text: isEditing ? 'Roles actualizados correctamente' : 'Impresora vinculada correctamente' });

                // Si es una nueva vinculación, la quitamos de la lista de "encontradas"
                if (!isEditing) {
                    setFoundDevices(prev => prev.filter(d => d.uid !== formData.uid));
                }

                setIsAdding(false);
                setEditingPrinter(null);
                setFormData({
                    name: '',
                    uid: '',
                    ip: '',
                    port: 9100,
                    baudRate: 38400,
                    connectionType: 'network',
                    paperWidth: 80,
                    roles: ['kitchen'],
                    locationId: selectedLocation
                });
                fetchPrinters();
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: err.error || 'Error al guardar' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al procesar la solicitud' });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar esta impresora?')) return;
        try {
            await fetch('/api/admin/printers/' + id, { method: 'DELETE' });
            fetchPrinters();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MdPrint className="h-6 w-6 text-indigo-600" />
                        Gestión de Impresoras
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sede Actual:</span>
                        <select
                            value={selectedLocation}
                            onChange={(e) => {
                                const newLoc = e.target.value;
                                setSelectedLocation(newLoc);
                                setFormData(prev => ({ ...prev, locationId: newLoc }));
                            }}
                            className="text-xs font-bold text-indigo-600 bg-indigo-50 border-none rounded-lg py-1 px-2 focus:ring-0 cursor-pointer hover:bg-indigo-100 transition-colors"
                        >
                            {locations.map(loc => (
                                <option key={loc.nameId} value={loc.nameId}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    {/* Panel de Pruebas Multitarea */}
                    <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-200 shadow-sm">
                        {['kitchen', 'bar', 'cashier'].map(role => (
                            <button
                                key={role}
                                onClick={() => setTestRoles(prev =>
                                    prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                                )}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${testRoles.includes(role) ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {role === 'kitchen' ? 'Cocina' : role === 'bar' ? 'Barra' : 'Caja'}
                            </button>
                        ))}
                        <button
                            onClick={() => handleTestPrint(null, testRoles)}
                            disabled={testRoles.length === 0}
                            className="ml-2 flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
                        >
                            <MdPrint className="h-3 w-3" /> Probar Tareas
                        </button>
                    </div>

                    <button
                        onClick={handleManualAdd}
                        disabled={scanning}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-all shadow-sm"
                    >
                        <MdAdd />
                        Nueva Manual
                    </button>
                    <button
                        onClick={handleScan}
                        disabled={scanning}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-all shadow-sm"
                    >
                        {scanning ? <MdRefresh className="animate-spin" /> : <MdSearch />}
                        {scanning ? 'Resolviendo IP...' : 'Escanear Red'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex flex-col gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
                    message.type === 'info' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {message.type === 'success' ? <MdCheckCircle className="h-5 w-5" /> : <MdError className="h-5 w-5" />}
                            <span className="font-medium">{message.text}</span>
                        </div>
                        <button onClick={() => setMessage(null)} className="opacity-40 hover:opacity-100 transition-opacity">
                            <MdClose className="h-4 w-4" />
                        </button>
                    </div>

                    {foundDevices.length > 0 && message.type === 'success' && (
                        <div className="mt-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-900/40 mb-3">Nuevos dispositivos detectados</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {foundDevices.map((device, idx) => (
                                    <div key={idx} className="bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-emerald-200/50 flex justify-between items-center group hover:border-emerald-400 transition-all shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                                <MdPrint className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-black text-[11px] text-gray-900 truncate max-w-[120px] uppercase">{device.name}</span>
                                                <span className="font-mono text-[9px] text-gray-400">{device.ip}:{device.port}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleQuickAdd(device)}
                                            className="text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                                        >
                                            Vincular
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Formulario (Vincular o Editar Roles) */}
            {(isAdding || editingPrinter) && (
                <form ref={formRef} onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-50 space-y-5 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b pb-4 mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <MdCheckCircle className="text-emerald-500" />
                            {editingPrinter ? 'Editar Tareas para:' : 'Configurar Roles para:'} {formData.name}
                        </h3>
                        <button type="button" onClick={() => { setIsAdding(false); setEditingPrinter(null); }} className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-xs font-medium">
                            Cancelar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre Identificativo</label>
                            <input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Ej: Cocina Principal"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo de Conexión</label>
                            <div className="flex bg-gray-100 rounded-xl p-1">
                                <button type="button" onClick={() => setFormData({ ...formData, connectionType: 'network' })} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.connectionType === 'network' || !formData.connectionType ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:bg-gray-200'}`}>Red / WiFi</button>
                                <button type="button" onClick={() => setFormData({ ...formData, connectionType: 'usb', port: 'COM3', ip: '' })} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.connectionType === 'usb' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:bg-gray-200'}`}>USB / Serial</button>
                            </div>
                        </div>

                        {formData.connectionType === 'usb' ? (
                            <>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Puerto COM (Windows)</label>
                                    <input
                                        required
                                        value={formData.port}
                                        onChange={e => setFormData({ ...formData, port: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Ej: COM3, COM4"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Baud Rate (Velocidad)</label>
                                    <select
                                        value={formData.baudRate || 38400}
                                        onChange={e => setFormData({ ...formData, baudRate: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                                    >
                                        <option value="9600">9600</option>
                                        <option value="19200">19200</option>
                                        <option value="38400">38400 (Ticket)</option>
                                        <option value="57600">57600</option>
                                        <option value="115200">115200</option>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">IP Address</label>
                                <input
                                    required
                                    value={formData.ip}
                                    onChange={e => setFormData({ ...formData, ip: e.target.value })}
                                    disabled={!!editingPrinter && formData.uid.startsWith('vtp-')} // Solo deshabilitar si es una virtual o editando scan real
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="Ej: 192.168.0.33"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 pt-2">
                        <div className="flex-1 space-y-3">
                            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">Tareas asignadas:</label>
                            <div className="flex gap-3 flex-wrap">
                                {['kitchen', 'bar', 'cashier'].map(role => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            roles: formData.roles.includes(role)
                                                ? formData.roles.filter(r => r !== role)
                                                : [...formData.roles, role]
                                        })}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 uppercase tracking-wide ${formData.roles.includes(role)
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200 hover:text-indigo-600'
                                            }`}
                                    >
                                        {role === 'kitchen' ? 'Cocina' : role === 'bar' ? 'Barra' : 'Caja / Ticket'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end items-end">
                            <button type="submit" className="w-full sm:w-auto px-10 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all uppercase tracking-widest text-[10px]">
                                {editingPrinter ? 'Guardar Cambios' : 'Finalizar Vinculación'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Lista de Impresoras */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {printers.map(printer => (
                    <div key={printer._id} className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all flex flex-col justify-between overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-all"></div>
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="font-extrabold text-gray-900 group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{printer.name}</h3>
                                <div className={`flex flex-col items-end gap-1`}>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${printer.statusMessage?.includes('papel') || printer.statusMessage === 'PAPER_OUT' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                        printer.lastStatus === 'online' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                            printer.lastStatus === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                printer.lastStatus === 'error' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                                    'bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                        <div className={`h-1.5 w-1.5 rounded-full ${printer.statusMessage?.includes('papel') || printer.statusMessage === 'PAPER_OUT' ? 'bg-orange-500 animate-pulse' :
                                            printer.lastStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                printer.lastStatus === 'pending' ? 'bg-amber-500 animate-bounce' :
                                                    printer.lastStatus === 'error' ? 'bg-rose-500' : 'bg-gray-500'
                                            }`}></div>
                                        {printer.statusMessage?.includes('papel') || printer.statusMessage === 'PAPER_OUT' ? 'Sin Papel' :
                                            printer.lastStatus === 'online' ? 'Conectado' :
                                                printer.lastStatus === 'pending' ? 'Imprimiendo' :
                                                    printer.lastStatus === 'error' ? 'Falla' : 'Offline'}
                                    </div>
                                    {printer.statusMessage && (
                                        <span className="text-[8px] font-bold text-gray-400 uppercase">{printer.statusMessage}</span>
                                    )}
                                </div>
                            </div>
                            <div className="mt-5 space-y-3">
                                <div className="flex items-center justify-between text-[11px] text-gray-400 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                                    <p className="flex items-center gap-2 font-mono text-xs font-bold">
                                        <MdDns className={`h-4 w-4 ${printer.connectionType === 'usb' ? 'text-emerald-500' : 'text-indigo-400'}`} />
                                        {printer.connectionType === 'usb'
                                            ? `USB: ${printer.port} (${printer.baudRate || 38400} baudios)`
                                            : printer.ip}
                                    </p>
                                    <div className="flex gap-2">
                                        {printer.connectionType !== 'usb' && (
                                            <button
                                                onClick={() => handleTestConnection(printer._id)}
                                                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm border border-indigo-50 transition-colors"
                                                title="Probar conexión IP"
                                            >
                                                <MdRefresh className="h-3 w-3" /> TEST
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleTestPrint(printer._id, printer.roles)}
                                            className="text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm border border-emerald-50 transition-colors"
                                            title="Encolar ticket de prueba (El agente lo recogerá)"
                                        >
                                            <MdPrint className="h-3 w-3" /> PRUEBA
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {printer.roles.map(role => (
                                        <span key={role} className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm shadow-indigo-100">
                                            {role === 'kitchen' ? 'Cocina' : role === 'bar' ? 'Barra' : 'Caja'}
                                        </span>
                                    ))}
                                    <button
                                        onClick={() => handleEditRoles(printer)}
                                        className="bg-gray-100 text-gray-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-gray-200 transition-colors"
                                    >
                                        Editar
                                    </button>
                                </div>

                                {/* SECCIÓN DE SIMULACIÓN (Solo para emuladores) */}
                                {printer.uid?.startsWith('vtp-') && (
                                    <div className="pt-3 mt-3 border-t border-dashed border-gray-100">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Simulación (vtpMdg)</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    const isPaperOut = printer.statusMessage === 'PAPER_OUT' || printer.statusMessage?.includes('papel');
                                                    await fetch(`http://${printer.ip}:2026/api/printers/${encodeURIComponent(printer.name)}/error`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ key: 'paperOut', value: !isPaperOut })
                                                    });
                                                    fetchPrinters();
                                                }}
                                                className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all ${printer.statusMessage === 'PAPER_OUT' || printer.statusMessage?.includes('papel')
                                                    ? 'bg-orange-500 text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600'
                                                    }`}
                                            >
                                                Papel: {printer.statusMessage === 'PAPER_OUT' || printer.statusMessage?.includes('papel') ? 'OFF' : 'ON'}
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    await fetch(`http://${printer.ip}:2026/api/printers/${encodeURIComponent(printer.name)}/reset`, {
                                                        method: 'POST'
                                                    });
                                                    fetchPrinters();
                                                }}
                                                className="px-2 py-1 rounded bg-gray-100 text-gray-500 text-[8px] font-bold uppercase hover:bg-blue-100 hover:text-blue-600 transition-all"
                                            >
                                                Reiniciar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-8 pt-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/30 -mx-6 -mb-6 px-6 py-4">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">UID: {printer.uid}</span>
                            <button
                                onClick={() => handleDelete(printer._id)}
                                className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Eliminar impresora"
                            >
                                <MdDelete className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {!loading && printers.length === 0 && !isAdding && (
                <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 animate-in fade-in duration-700">
                    <MdPrint className="mx-auto h-16 w-16 text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-gray-400">Sin impresoras configuradas</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                        Presiona "Escanear Red" para detectar dispositivos automáticamente.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PrinterManagement;