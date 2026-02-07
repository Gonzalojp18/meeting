'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import API_URI from '@/utils/getApiUri';
import { useFetch } from '@/hooks/useFetch';
import { MdEdit, MdDelete, MdPersonAdd } from 'react-icons/md';

const UserManagement = ({ locations }) => {
    const { data: session, status } = useSession();
    const token = session?.user?.token;
    const isAdmin = session?.user?.role === 'admin';
    const isManager = session?.user?.role === 'manager';
    const canManageUsers = isAdmin || isManager;

    // Solo hacer fetch cuando la sesión esté lista y el usuario tenga permisos
    const shouldFetch = status === 'authenticated' && canManageUsers;
    const { data: users, loading, error, refetch } = useFetch(
        shouldFetch ? `${API_URI}/api/admin/users` : null,
        token
    );

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        assignedLocations: []
    });

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '', // Don't show password
                role: user.role,
                assignedLocations: user.assignedLocations || []
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'staff',
                assignedLocations: []
            });
        }
        setIsModalOpen(true);
    };

    const handleToggleLocation = (locId) => {
        setFormData(prev => ({
            ...prev,
            assignedLocations: prev.assignedLocations.includes(locId)
                ? prev.assignedLocations.filter(id => id !== locId)
                : [...prev.assignedLocations, locId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const authConfig = {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            };
            if (editingUser) {
                await axios.put(`${API_URI}/api/admin/users/${editingUser._id}`, formData, authConfig);
            } else {
                await axios.post(`${API_URI}/api/admin/users`, formData, authConfig);
            }
            setIsModalOpen(false);
            refetch();
        } catch (err) {
            console.error('Error saving user:', err);
            alert('Error al guardar el usuario');
        }
    };

    const handleDelete = async (userId) => {
        if (confirm('¿Estás seguro de eliminar este usuario?')) {
            try {
                await axios.delete(`${API_URI}/api/admin/users/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true
                });
                refetch();
            } catch (err) {
                console.error('Error deleting user:', err);
            }
        }
    };

    if (status === 'loading' || loading) return <div className="p-8 text-center text-gray-500">Cargando usuarios...</div>;

    if (!canManageUsers) {
        return (
            <div className="p-8 text-center text-red-500">
                No tienes permisos para acceder a esta sección. Se requiere rol de administrador o manager.
            </div>
        );
    }

    // Roles disponibles según el rol del usuario actual
    const getAvailableRoles = () => {
        if (isAdmin) {
            return [
                { value: 'admin', label: 'Administrador / Owner' },
                { value: 'manager', label: 'Manager' },
                { value: 'staff', label: 'Staff / Caja' }
            ];
        }
        // Manager solo puede crear staff
        return [
            { value: 'staff', label: 'Staff / Caja' }
        ];
    };

    const availableRoles = getAvailableRoles();

    return (
        <div className="bg-white shadow sm:rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Gestión de Usuarios / Staff</h3>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-sm font-medium"
                >
                    <MdPersonAdd size={20} />
                    Nuevo Usuario
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sedes</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users?.map((user, index) => (
                            <tr key={user._id || `user-${index}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                        user.role === 'admin'
                                            ? 'bg-purple-100 text-purple-700'
                                            : user.role === 'manager'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'Staff'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {user.assignedLocations?.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {user.assignedLocations.map((locId, idx) => {
                                                const location = locations?.find(l => l.nameId === locId);
                                                return (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                                                    >
                                                        {location?.name || locId}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">Sin asignar</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {/* Manager no puede editar/eliminar admin o managers */}
                                    {(isAdmin || (isManager && user.role === 'staff')) ? (
                                        <>
                                            <button onClick={() => handleOpenModal(user)} className="text-orange-600 hover:text-orange-900 mr-4">
                                                <MdEdit size={20} />
                                            </button>
                                            <button onClick={() => handleDelete(user._id)} className="text-red-600 hover:text-red-900">
                                                <MdDelete size={20} />
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-gray-400 text-xs italic">Sin permisos</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal remains simplified for brevity, in a real tool it would be a full absolute component */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <h4 className="text-lg font-bold mb-4">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h4>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    type="text" required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email" required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                    <input
                                        type="password" required
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    {availableRoles.map(role => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                </select>
                                {isManager && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Como manager, solo puedes crear usuarios con rol de Staff
                                    </p>
                                )}
                            </div>
                            {/* Solo mostrar sedes si el rol es staff */}
                            {formData.role === 'staff' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Asignar Sedes
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">
                                        El cajero solo verá pedidos de las sedes seleccionadas
                                    </p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {locations?.map((loc, index) => (
                                            <label
                                                key={loc.nameId || loc._id || `loc-${index}`}
                                                className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                                    formData.assignedLocations.includes(loc.nameId)
                                                        ? 'border-orange-500 bg-orange-50'
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.assignedLocations.includes(loc.nameId)}
                                                    onChange={() => handleToggleLocation(loc.nameId)}
                                                    className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500"
                                                />
                                                <div>
                                                    <span className="font-medium text-gray-900">{loc.name}</span>
                                                    <span className="text-xs text-gray-500 block">ID: {loc.nameId}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border rounded-lg text-gray-600 font-medium hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-md"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
