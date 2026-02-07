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

    // Publishing Registrations
    getPublishing: async (token) => {
        const res = await fetch(`${API_BASE_URL}/publishing`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch publishing registrations');
        const rows = await res.json();
        return rows.map(r => ({
            id: r.id,
            title: r.title,
            songCode: r.song_code,
            otherTitle: r.other_title,
            sampleLink: r.sample_link,
            rightsGranted: r.rights_granted,
            performer: r.performer,
            duration: r.duration,
            genre: r.genre,
            language: r.language,
            region: r.region,
            iswc: r.iswc,
            isrc: r.isrc,
            lyrics: r.lyrics,
            note: r.note,
            songwriters: r.songwriters,
            status: r.status,
            submissionDate: r.submission_date
        }));
    },

    createPublishing: async (token, data) => {
        const payload = {
            title: data.title,
            song_code: data.songCode,
            other_title: data.otherTitle,
            sample_link: data.sampleLink,
            rights_granted: data.rightsGranted,
            performer: data.performer,
            duration: data.duration,
            genre: data.genre,
            language: data.language,
            region: data.region,
            iswc: data.iswc,
            isrc: data.isrc,
            lyrics: data.lyrics,
            note: data.note,
            songwriters: data.songwriters
        };

        const res = await fetch(`${API_BASE_URL}/publishing`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create publishing registration');
        return res.json();
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
    }
};
