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
        setWizardStep('SELECTION');
        setReleaseType(null);
        setEditingRelease(null); // Clear editing state when going back
    };

    if (wizardStep === 'WIZARD' && releaseType) {
        return (
            <ReleaseWizard 
                type={releaseType} 
                onBack={handleBack}
                onSave={onSaveRelease}
                initialData={editingRelease || undefined}
                savedSongwriters={savedSongwriters}
                onAddSongwriter={() => navigate('/publishing/writer')} 
            />
        );
    }

    return <ReleaseTypeSelection onSelect={handleSelectType} />;
};
