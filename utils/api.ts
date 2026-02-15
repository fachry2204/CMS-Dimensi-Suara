export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const parseResponse = async (res: Response) => {
    if (res.status === 401 || res.status === 403) {
        const err: any = new Error('AUTH');
        err.status = res.status;
        throw err;
    }
    if (!res.ok) {
        // Try read json, else text
        try {
            const j = await res.json();
            throw new Error(j.error || 'Request failed');
        } catch {
            const t = await res.text().catch(() => '');
            throw new Error(t || 'Request failed');
        }
    }
    return res.json();
};

export const api = {
    // Auth
    login: async (username, password) => {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Login failed');
        }
        return res.json();
    },
    
    logout: async () => {
        const res = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Logout failed');
        return res.json();
    },

    register: async (username, email, password) => {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Registration failed');
        return res.json();
    },

    // Releases
    getReleases: async (token) => {
        const res = await fetch(`${API_BASE_URL}/releases`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include'
        });
        return parseResponse(res);
    },

    updateReleaseWorkflow: async (token, data) => {
        const res = await fetch(`${API_BASE_URL}/releases/${data.id}/workflow`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            credentials: 'include',
            body: JSON.stringify({
                status: data.status,
                aggregator: data.aggregator,
                upc: data.upc,
                rejectionReason: (data as any).rejectionReason,
                rejectionDescription: (data as any).rejectionDescription,
                tracks: (data.tracks || []).map((t: any) => ({
                    id: t.id,
                    isrc: t.isrc
                }))
            })
        });
        return parseResponse(res);
    },

    getRelease: async (token, id) => {
        const res = await fetch(`${API_BASE_URL}/releases/${id}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include'
        });
        return parseResponse(res);
    },

    deleteRelease: async (token, id) => {
        const res = await fetch(`${API_BASE_URL}/releases/${id}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include'
        });
        return parseResponse(res);
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
                if (track.audioClip instanceof File) {
                    formData.append(`track_${index}_clip`, track.audioClip);
                }
                if (track.iplFile instanceof File) {
                    formData.append(`track_${index}_ipl`, track.iplFile);
                }
            });
        }

        // Append JSON data
        formData.append('data', JSON.stringify(data));

        const res = await fetch(`${API_BASE_URL}/releases`, {
            method: 'POST',
            headers: { 
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                // Content-Type must be undefined for FormData
            },
            body: formData,
            credentials: 'include'
        });
        
        return parseResponse(res);
    },

    // Reports
    getReports: async (token) => {
        const res = await fetch(`${API_BASE_URL}/reports`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include'
        });
        return parseResponse(res);
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
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include'
        });
        return parseResponse(res);
    },

    markNotificationRead: async (token, id) => {
        const res = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ id }),
            credentials: 'include'
        });
        return parseResponse(res);
    },

    // User Profile
    getProfile: async (token) => {
        const res = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include'
        });
        return parseResponse(res);
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
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: formData,
            credentials: 'include'
        });

        return parseResponse(res);
    },

    // Songwriters removed

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
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            credentials: 'include'
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
