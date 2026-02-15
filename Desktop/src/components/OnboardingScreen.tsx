import { useState } from 'react';
import { User, ArrowRight, Loader2 } from 'lucide-react';
import './OnboardingScreen.css';
import { TauriService } from '../services/TauriService';

interface OnboardingScreenProps {
    onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async () => {
        if (!username.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            await TauriService.registerUser(username);
            onComplete();
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRegister();
        }
    };

    return (
        <div className="onboarding-container">
            <div className="onboarding-card">
                <div className="onboarding-icon">
                    <User size={48} />
                </div>

                <h1 className="onboarding-title">Welcome to NeoChat</h1>
                <p className="onboarding-subtitle">Your secure, decentralized messenger.</p>

                <div className="onboarding-form">
                    <div className="input-group">
                        <label>Choose a Username</label>
                        <input
                            type="text"
                            placeholder="e.g. NeoUser"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button
                        className="btn-primary"
                        onClick={handleRegister}
                        disabled={isLoading || !username.trim()}
                    >
                        {isLoading ? <Loader2 className="spinner" size={20} /> : "Create Profile"}
                        {!isLoading && <ArrowRight size={20} />}
                    </button>
                </div>

                <div className="onboarding-footer">
                    <p>Your keys are generated locally. No phone number required.</p>
                </div>
            </div>
        </div>
    );
}
