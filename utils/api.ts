export const API_BASE_URL = '/api';

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
        const res = await fetch(`${API_BASE_URL}/releases`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create release');
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
    }
};
