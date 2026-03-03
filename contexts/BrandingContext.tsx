import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BrandingSettings {
    login_button_color?: string;
    login_title_color?: string;
    login_glass_effect?: boolean;
    login_form_text_color?: string;
    [key: string]: any;
}

interface BrandingContextType {
    branding: BrandingSettings;
    isLoading: boolean;
    refreshBranding: () => Promise<void>;
    getButtonColor: () => string;
    getTextColor: () => string;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [branding, setBranding] = useState<BrandingSettings>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchBranding = async () => {
        try {
            const res = await fetch('/api/settings/branding');
            if (res.ok) {
                const data = await res.json();
                setBranding(data);
            }
        } catch (error) {
            console.error("Failed to fetch branding:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBranding();
    }, []);

    const getButtonColor = () => {
        return branding.login_button_color || '#4f46e5'; // Default indigo-600
    };

    const getTextColor = () => {
        return branding.login_title_color || '#1e293b'; // Default slate-800
    };

    return (
        <BrandingContext.Provider value={{ branding, isLoading, refreshBranding: fetchBranding, getButtonColor, getTextColor }}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => {
    const context = useContext(BrandingContext);
    if (context === undefined) {
        throw new Error('useBranding must be used within a BrandingProvider');
    }
    return context;
};
