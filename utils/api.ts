export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const parseResponse = async (res: Response) => {
    if (res.status === 401 || res.status === 403) {
        const err: any = new Error('AUTH');
        err.status = res.status;
        throw err;
    }
    if (res.status === 413) {
        const err: any = new Error('UPLOAD_TOO_LARGE');
        err.status = 413;
        throw err;
    }
    if (!res.ok) {
        // Try read json, else text
        try {
            const j = await res.json();
            let msg = j.error || 'Request failed';
            if (j.duplicate && Array.isArray(j.duplicate) && j.duplicate.length > 0) {
                msg += ` (Duplikasi: ${j.duplicate.join(', ')})`;
            }
            const err: any = new Error(msg);
            (err as any).status = res.status;
            err.payload = j;
            throw err;
        } catch {
            const t = await res.text().catch(() => '');
            const err: any = new Error(t || 'Request failed');
            (err as any).status = res.status;
            throw err;
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
        let json: any = null;
        try {
            json = await res.json();
        } catch {
            if (!res.ok) {
                throw new Error('Login failed: server returned an invalid response');
            }
            throw new Error('Login failed: empty response from server');
        }
        if (!res.ok) {
            throw new Error(json?.error || 'Login failed');
        }
        return json;
    },
    
    logout: async () => {
        const res = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Logout failed');
        return res.json();
    },

    register: async (payload) => {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        return parseResponse(res);
    },
    checkRegisterDuplicates: async (payload) => {
        const res = await fetch(`${API_BASE_URL}/auth/check-duplicate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        return parseResponse(res);
    },
    checkRegisterDuplicatesGet: async (payload) => {
        const params = new URLSearchParams();
        Object.entries(payload || {}).forEach(([k, v]) => {
            if (v !== undefined && v !== null && String(v).length > 0) {
                params.append(k, String(v));
            }
        });
        const res = await fetch(`${API_BASE_URL}/auth/check-duplicate?${params.toString()}`, {
            method: 'GET',
            credentials: 'include'
        });
        return parseResponse(res);
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

    uploadReleaseFile: async (token, releaseMeta, fieldName, file) => {
        const formData = new FormData();
        formData.append('data', JSON.stringify({
            title: releaseMeta.title,
            primaryArtists: releaseMeta.primaryArtists || []
        }));
        formData.append(fieldName, file);

        const res = await fetch(`${API_BASE_URL}/releases/upload`, {
            method: 'POST',
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
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

    uploadUserDoc: async (_token, type, file) => {
        const formData = new FormData();
        formData.append('type', type);
        formData.append('file', file);

        const res = await fetch(`${API_BASE_URL}/users/upload-doc`, {
            method: 'POST',
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
        const json = await res.json();
        if (Array.isArray(json)) return json;
        if (Array.isArray((json as any).users)) return (json as any).users;
        if (Array.isArray((json as any).data)) return (json as any).data;
        return [];
    },
    getUser: async (token, id) => {
        const res = await fetch(`${API_BASE_URL}/users/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
        });
        return parseResponse(res);
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
    },
    
    updateUserStatus: async (token, userId, status, reason?: string) => {
        const res = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status, reason }),
            credentials: 'include'
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({} as any));
            throw new Error((err as any).error || 'Failed to update status');
        }
        return res.json();
    }
};
