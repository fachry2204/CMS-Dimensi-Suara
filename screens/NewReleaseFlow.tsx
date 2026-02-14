import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReleaseTypeSelection } from './ReleaseTypeSelection';
import { ReleaseWizard } from './ReleaseWizard';
import { ReleaseType, ReleaseData } from '../types';

interface NewReleaseFlowProps {
    editingRelease: ReleaseData | null;
    setEditingRelease: (release: ReleaseData | null) => void;
    onSaveRelease: (data: ReleaseData) => void;
}

export const NewReleaseFlow: React.FC<NewReleaseFlowProps> = ({ 
    editingRelease, 
    setEditingRelease, 
    onSaveRelease 
}) => {
    const navigate = useNavigate();
    const [wizardStep, setWizardStep] = useState<'SELECTION' | 'WIZARD'>('SELECTION');
    const [releaseType, setReleaseType] = useState<ReleaseType | null>(null);

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
        // Confirmation is now handled within ReleaseWizard component
        setWizardStep('SELECTION');
        setReleaseType(null);
        setEditingRelease(null); // Clear editing state when going back
        
        // No local/session storage for wizard (by policy)
    };

    const handleSave = (data: ReleaseData) => {
        // No persistence cleanup needed; nothing stored locally
        onSaveRelease(data);
    };

    if (wizardStep === 'WIZARD' && releaseType) {
        return (
            <ReleaseWizard 
                type={releaseType} 
                onBack={handleBack}
                onSave={handleSave}
                initialData={editingRelease || undefined}
            />
        );
    }

    return <ReleaseTypeSelection onSelect={handleSelectType} />;
};
