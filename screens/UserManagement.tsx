import React, { useState } from 'react';
import { 
    Users, 
    Shield, 
    User as UserIcon,
    Search,
    MoreVertical,
    CheckCircle,
    XCircle,
    Plus,
    Mail,
    Lock
} from 'lucide-react';
import { User } from '../types';

// Dummy Initial Data
const INITIAL_USERS: User[] = [
    {
        id: '1',
        name: 'Super Admin',
        email: 'admin@dimensisuara.com',
        role: 'Admin',
        status: 'Active',
        joinedDate: '2023-01-01',
    },
    {
        id: '2',
        name: 'Operator One',
        email: 'operator1@dimensisuara.com',
        role: 'Operator',
        status: 'Active',
        joinedDate: '2023-05-15',
    },
    {
        id: '3',
        name: 'John Doe',
        email: 'johndoe@gmail.com',
        role: 'User',
        status: 'Active',
        joinedDate: '2024-02-10',
    },
    {
        id: '4',
        name: 'Jane Smith',
        email: 'jane.smith@yahoo.com',
        role: 'User',
        status: 'Inactive',
        joinedDate: '2024-02-11',
    }
];

export const UserManagement: React.FC = () => {
  // --- USER MANAGEMENT LOGIC ---
  const [userTab, setUserTab] = useState<'INTERNAL' | 'REGISTERED'>('INTERNAL');
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add User Form State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Operator' as 'Admin' | 'Operator',
    password: ''
  });

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) return;

    const user: User = {
        id: Date.now().toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: 'Active',
        joinedDate: new Date().toISOString().split('T')[0]
    };

    setUsers([...users, user]);
    setShowAddUserModal(false);
    setNewUser({ name: '', email: '', role: 'Operator', password: '' });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (userTab === 'INTERNAL') {
        return matchesSearch && (user.role === 'Admin' || user.role === 'Operator');
    } else {
        return matchesSearch && user.role === 'User';
    }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
       <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <Users size={32} className="text-slate-400" />
                User Management
            </h1>
            <p className="text-slate-500 mt-1 ml-11">Manage system access and registered users.</p>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">User Management</h2>
                        <p className="text-sm text-slate-500">Manage system access and registered users.</p>
                    </div>
                </div>
                
                {userTab === 'INTERNAL' && (
                    <button 
                        onClick={() => setShowAddUserModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        <Plus size={18} />
                        Add New User
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setUserTab('INTERNAL')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        userTab === 'INTERNAL' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Shield size={16} />
                    Internal Users (Admin/Operator)
                </button>
                <button
                    onClick={() => setUserTab('REGISTERED')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        userTab === 'REGISTERED' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <UserIcon size={16} />
                    Registered Users
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined Date</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-800">{user.name}</div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'Operator' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {user.status === 'Active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">
                                        {user.joinedDate}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button className="text-slate-400 hover:text-slate-600">
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                                    No users found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
       </div>

       {/* Add User Modal */}
       {showAddUserModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                        <h3 className="text-lg font-bold text-slate-800">Add Internal User</h3>
                        <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600">
                            <XCircle size={24} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                                    placeholder="John Doe"
                                    value={newUser.name}
                                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="email" 
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                                    placeholder="john@dimensisuara.com"
                                    value={newUser.email}
                                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select 
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none appearance-none bg-white"
                                    value={newUser.role}
                                    onChange={e => setNewUser({...newUser, role: e.target.value as 'Admin' | 'Operator'})}
                                >
                                    <option value="Operator">Operator</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="password" 
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                                    placeholder="••••••••"
                                    value={newUser.password}
                                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-slate-50">
                        <button 
                            onClick={() => setShowAddUserModal(false)}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAddUser}
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                        >
                            Create User
                        </button>
                    </div>
                </div>
            </div>
       )}
    </div>
  );
};
