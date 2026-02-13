export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
    // Auth
    login: async (username, password) => {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Login failed');
        }
        return res.json();
    },

    register: async (username, email, password) => {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        if (!res.ok) throw new Error('Registration failed');
        return res.json();
    },

    // Releases
    getReleases: async (token) => {
        const res = await fetch(`${API_BASE_URL}/releases`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch releases');
        return res.json();
    },

    createRelease: async (token, data) => {
        const formData = new FormData();
        
        // Append files
        if (data.coverArt instanceof File) {
            formData.append('coverArt', data.coverArt);
        }
        
        if (data.tracks && Array.isArray(data.tracks)) {
            data.tracks.forEach((track, index) => {
                if (track.audioFile instanceof File) {
                    formData.append(`track_${index}_audio`, track.audioFile);
                }
            });
        }

        // Append JSON data
        formData.append('data', JSON.stringify(data));

        const res = await fetch(`${API_BASE_URL}/releases`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`
                // Content-Type must be undefined for FormData
            },
            body: formData
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create release');
        }
        return res.json();
    },

    // Reports
    getReports: async (token) => {
        const res = await fetch(`${API_BASE_URL}/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch reports');
        return res.json();
    },

    importReports: async (token, data) => {
        const res = await fetch(`${API_BASE_URL}/reports/import`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ data })
        });
        if (!res.ok) throw new Error('Failed to import reports');
        return res.json();
    },

    // Notifications
    getNotifications: async (token) => {
        const res = await fetch(`${API_BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch notifications');
        return res.json();
    },

    markNotificationRead: async (token, id) => {
        const res = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id })
        });
        if (!res.ok) throw new Error('Failed to mark notification');
        return res.json();
    },

    // User Profile
    getProfile: async (token) => {
        const res = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
    },

    updateProfile: async (token, data) => {
        const formData = new FormData();
        if (data.username) formData.append('username', data.username);
        if (data.email) formData.append('email', data.email);
        if (data.password) formData.append('password', data.password);
        if (data.profilePicture instanceof File) {
            formData.append('profilePicture', data.profilePicture);
        }

        const res = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update profile');
        }
        return res.json();
    },

    // Songwriters
    getSongwriters: async (token) => {
        const res = await fetch(`${API_BASE_URL}/songwriters`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch songwriters');
        const rows = await res.json();
        // Map snake_case DB to camelCase Frontend
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            firstName: r.first_name,
            lastName: r.last_name,
            email: r.email,
            phone: r.phone,
            nik: r.nik,
            npwp: r.npwp,
            country: r.country,
            province: r.province,
            city: r.city,
            district: r.district,
            village: r.village,
            postalCode: r.postal_code,
            address1: r.address1,
            address2: r.address2,
            bankName: r.bank_name,
            bankBranch: r.bank_branch,
            accountName: r.account_name,
            accountNumber: r.account_number,
            publisher: r.publisher,
            ipi: r.ipi
        }));
    },

    createSongwriter: async (token, data) => {
        // Map camelCase Frontend to snake_case DB
        const payload = {
            name: data.name,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            nik: data.nik,
            npwp: data.npwp,
            country: data.country,
            province: data.province,
            city: data.city,
            district: data.district,
            village: data.village,
            postal_code: data.postalCode,
            address1: data.address1,
            address2: data.address2,
            bank_name: data.bankName,
            bank_branch: data.bankBranch,
            account_name: data.accountName,
            account_number: data.accountNumber,
            publisher: data.publisher,
            ipi: data.ipi
        };

        const res = await fetch(`${API_BASE_URL}/songwriters`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create songwriter');
        return res.json();
    },

    // Publishing Registrations (Removed)
    getPublishing: async (token) => {
        return []; // Removed
    },

    createPublishing: async (token, data) => {
        return {}; // Removed
    },

    // Settings
    getAggregators: async (token) => {
        const res = await fetch(`${API_BASE_URL}/settings/aggregators`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch aggregators');
        return res.json();
    },

    updateAggregators: async (token, aggregators) => {
        const res = await fetch(`${API_BASE_URL}/settings/aggregators`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ aggregators })
        });
        if (!res.ok) throw new Error('Failed to update aggregators');
        return res.json();
    },

    // User Management
    getUsers: async (token) => {
        const res = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },

    createUser: async (token, userData) => {
        const res = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create user');
        }
        return res.json();
    },

    deleteUser: async (token, userId) => {
        const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
             const err = await res.json();
             throw new Error(err.error || 'Failed to delete user');
        }
        return res.json();
    }
};
