import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { YigYapsPublisherClient, YigYapsSecurityClient } from '@yigyaps/client';

export function PublishSkillPage() {
    const { user, login } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        packageId: '',
        displayName: '',
        description: '',
        category: 'legal',
        authorName: user?.githubUsername || 'anonymous',
        rules: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // If not logged in, prompt sign in
    if (!user) {
        return (
            <div className="app-container">
                <header className="header">
                    <Link to="/" className="logo">
                        Yig<span>Yaps</span>
                    </Link>
                </header>
                <main className="main-content" style={{ textAlign: 'center', padding: '5rem' }}>
                    <h2>Authentication Required</h2>
                    <p>You must be signed in to publish a new secure skill.</p>
                    <button className="btn btn-primary" onClick={login} style={{ marginTop: '2rem' }}>
                        Sign In Now
                    </button>
                </main>
            </div>
        );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3100';
        // Dummy JWT handling for MVP UI
        const token = localStorage.getItem('auth_token') || 'dummy-token';

        const publisher = new YigYapsPublisherClient({ baseUrl, apiKey: token });
        const security = new YigYapsSecurityClient({ baseUrl, apiKey: token });

        try {
            // Step 1: Create package metadata
            await publisher.publishPackage({
                packageId: formData.packageId,
                displayName: formData.displayName,
                description: formData.description,
                authorName: formData.authorName,
                category: formData.category,
                maturity: 'experimental',
                license: 'proprietary',
            });

            // Step 2: Encrypt knowledge rules into Vault
            await security.encryptKnowledge(formData.packageId, formData.rules);

            setSuccess(true);
            setTimeout(() => navigate(`/skill/${formData.packageId}`), 2000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || 'An error occurred during publishing.');
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container">
            <header className="header">
                <Link to="/" className="logo">
                    Yig<span>Yaps</span>
                </Link>
                <nav className="nav-links">
                    <Link to="/">Marketplace</Link>
                </nav>
            </header>

            <main className="main-content" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
                <h1 style={{ marginBottom: '1rem' }}>Publish Secure Skill</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    Deploy your expert knowledge. Your rules will be instantly AES-256 Envelope Encrypted upon reaching the Vault. The platform guarantees these rules will never be handed out to an external AI model in plaintext.
                </p>

                {success && (
                    <div style={{ padding: '1rem', background: 'rgba(0,255,100,0.1)', color: '#2ecc71', borderRadius: '8px', marginBottom: '2rem' }}>
                        🎉 Skill published securely! Redirecting to the detail page...
                    </div>
                )}

                {error && (
                    <div style={{ padding: '1rem', background: 'rgba(255,0,0,0.1)', color: '#e74c3c', borderRadius: '8px', marginBottom: '2rem' }}>
                        ❌ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Unique Package ID *</label>
                        <input
                            required
                            name="packageId"
                            value={formData.packageId}
                            onChange={handleChange}
                            placeholder="e.g. legal-contract-reviewer"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'white' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Display Name *</label>
                        <input
                            required
                            name="displayName"
                            value={formData.displayName}
                            onChange={handleChange}
                            placeholder="Legal Contract Reviewer Pro"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'white' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Short Description *</label>
                        <input
                            required
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="A secure skill that reviews contracts for loopholes."
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'white' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Category</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'white' }}
                        >
                            <option value="legal">Legal & Compliance</option>
                            <option value="medical">Medical Check</option>
                            <option value="finance">Financial Analysis</option>
                            <option value="engineering">Engineering</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            Expert IP Rules (Plaintext - Safe in Form)
                        </label>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                            These rules are sent via TLS and encrypted at rest using AES-GCM. They are only ever decrypted in volatile memory for sandbox execution.
                        </p>
                        <textarea
                            required
                            name="rules"
                            value={formData.rules}
                            onChange={handleChange}
                            rows={8}
                            placeholder="Rule 1: If condition A matches, do B..."
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'white', fontFamily: 'monospace' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || success}
                        style={{ padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}
                    >
                        {loading ? 'Encrypting & Committing IP...' : 'Secure & Publish Skill'}
                    </button>
                </form>
            </main>
        </div>
    );
}
