import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReleaseTypeSelection } from './ReleaseTypeSelection';
import { ReleaseWizard } from './ReleaseWizard';
import { ReleaseType, ReleaseData, SavedSongwriter } from '../types';

interface NewReleaseFlowProps {
    editingRelease: ReleaseData | null;
    setEditingRelease: (release: ReleaseData | null) => void;
    savedSongwriters: SavedSongwriter[];
    onSaveRelease: (data: ReleaseData) => void;
}

export const NewReleaseFlow: React.FC<NewReleaseFlowProps> = ({ 
    editingRelease, 
    setEditingRelease, 
    savedSongwriters, 
    onSaveRelease 
}) => {
    const navigate = useNavigate();
    const [wizardStep, setWizardStep] = useState<'SELECTION' | 'WIZARD'>(() => {
        const savedStep = sessionStorage.getItem('cms_wizard_step');
        return (savedStep === 'WIZARD' || savedStep === 'SELECTION') ? savedStep : 'SELECTION';
    });
    const [releaseType, setReleaseType] = useState<ReleaseType | null>(() => {
        return sessionStorage.getItem('cms_wizard_type') as ReleaseType | null;
    });

    // Persist state
    useEffect(() => {
        sessionStorage.setItem('cms_wizard_step', wizardStep);
    }, [wizardStep]);

    useEffect(() => {
        if (releaseType) {
            sessionStorage.setItem('cms_wizard_type', releaseType);
        } else {
            sessionStorage.removeItem('cms_wizard_type');
        }
    }, [releaseType]);

    // Initial state setup if editing
    useEffect(() => {
        if (editingRelease) {
            setReleaseType(editingRelease.type as ReleaseType);
            setWizardStep('WIZARD');
        }
    }, [editingRelease]);

    const handleSelectType = (type: ReleaseType) => {
        setReleaseType(type);
        setWizardStep('WIZARD');
    };

    const handleBack = () => {
        if (confirm("Are you sure you want to go back? Your progress will be lost.")) {
            setWizardStep('SELECTION');
            setReleaseType(null);
            setEditingRelease(null); // Clear editing state when going back
            
            // Clear storage
            sessionStorage.removeItem('cms_wizard_step');
            sessionStorage.removeItem('cms_wizard_type');
            localStorage.removeItem('cms_wizard_data'); // Clear wizard data too
            localStorage.removeItem('cms_wizard_current_step');
        }
    };

    const handleSave = (data: ReleaseData) => {
        // Clear storage before saving
        sessionStorage.removeItem('cms_wizard_step');
        sessionStorage.removeItem('cms_wizard_type');
        localStorage.removeItem('cms_wizard_data');
        localStorage.removeItem('cms_wizard_current_step');
        
        onSaveRelease(data);
    };

    if (wizardStep === 'WIZARD' && releaseType) {
        return (
            <ReleaseWizard 
                type={releaseType} 
                onBack={handleBack}
                onSave={handleSave}
                initialData={editingRelease || undefined}
                savedSongwriters={savedSongwriters}
                onAddSongwriter={() => navigate('/publishing/writer')} 
            />
        );
    }

    return <ReleaseTypeSelection onSelect={handleSelectType} />;
};
