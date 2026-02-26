import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchApi } from '../lib/api';

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
                <main className="main-content auth-required-panel">
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

        try {
            // Step 1: Create package metadata
            // Uses httpOnly cookie authentication automatically via fetchApi
            await fetchApi('/v1/packages', {
                method: 'POST',
                body: JSON.stringify({
                    packageId: formData.packageId,
                    displayName: formData.displayName,
                    description: formData.description,
                    authorName: formData.authorName,
                    category: formData.category,
                    maturity: 'experimental',
                    license: 'proprietary',
                }),
            });

            // Step 2: Encrypt knowledge rules into Vault
            await fetchApi(`/knowledge/${formData.packageId}`, {
                method: 'POST',
                body: JSON.stringify({
                    plaintextRules: formData.rules,
                }),
            });

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

            <main className="main-content publish-container">
                <h1 className="publish-header">Publish Secure Skill</h1>
                <p className="publish-desc">
                    Deploy your expert knowledge. Your rules will be instantly AES-256 Envelope Encrypted upon reaching the Vault. The platform guarantees these rules will never be handed out to an external AI model in plaintext.
                </p>

                {success && (
                    <div className="alert-success">
                        🎉 Skill published securely! Redirecting to the detail page...
                    </div>
                )}

                {error && (
                    <div className="alert-error">
                        ❌ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="publish-form">

                    <div className="form-group-spaced">
                        <label>Unique Package ID *</label>
                        <input
                            required
                            name="packageId"
                            value={formData.packageId}
                            onChange={handleChange}
                            placeholder="e.g. legal-contract-reviewer"
                            className="publish-input"
                        />
                    </div>

                    <div className="form-group-spaced">
                        <label>Display Name *</label>
                        <input
                            required
                            name="displayName"
                            value={formData.displayName}
                            onChange={handleChange}
                            placeholder="Legal Contract Reviewer Pro"
                            className="publish-input"
                        />
                    </div>

                    <div className="form-group-spaced">
                        <label>Short Description *</label>
                        <input
                            required
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="A secure skill that reviews contracts for loopholes."
                            className="publish-input"
                        />
                    </div>

                    <div className="form-group-spaced">
                        <label>Category</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="publish-select"
                        >
                            <option value="legal">Legal & Compliance</option>
                            <option value="medical">Medical Check</option>
                            <option value="finance">Financial Analysis</option>
                            <option value="engineering">Engineering</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="form-group-spaced">
                        <label>
                            Expert IP Rules (Plaintext - Safe in Form)
                        </label>
                        <p className="rule-help-text">
                            These rules are sent via TLS and encrypted at rest using AES-GCM. They are only ever decrypted in volatile memory for sandbox execution.
                        </p>
                        <textarea
                            required
                            name="rules"
                            value={formData.rules}
                            onChange={handleChange}
                            rows={8}
                            placeholder="Rule 1: If condition A matches, do B..."
                            className="publish-textarea"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary publish-btn"
                        disabled={loading || success}
                    >
                        {loading ? 'Encrypting & Committing IP...' : 'Secure & Publish Skill'}
                    </button>
                </form>
            </main>
        </div>
    );
}
