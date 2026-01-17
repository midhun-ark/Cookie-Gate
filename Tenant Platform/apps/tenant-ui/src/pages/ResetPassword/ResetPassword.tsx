import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { authApi } from '@/api';
import { useAuthStore } from '@/store';
import { getErrorMessage } from '@/api/client';
import '../Login/Login.css';

export function ResetPasswordPage() {
    const navigate = useNavigate();
    const { user, updateUser } = useAuthStore();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if user doesn't need to reset password
    if (user && !user.mustResetPassword) {
        navigate('/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.forceResetPassword(newPassword, confirmPassword);

            // Update auth state
            updateUser(response.user);
            localStorage.setItem('tenant_token', response.token);

            navigate('/');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const passwordRequirements = [
        { met: newPassword.length >= 8, text: 'At least 8 characters' },
        { met: /[A-Z]/.test(newPassword), text: 'One uppercase letter' },
        { met: /[a-z]/.test(newPassword), text: 'One lowercase letter' },
        { met: /\d/.test(newPassword), text: 'One number' },
        { met: /[@$!%*?&]/.test(newPassword), text: 'One special character (@$!%*?&)' },
    ];

    const allRequirementsMet = passwordRequirements.every((r) => r.met);

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo">
                            <Lock size={40} />
                        </div>
                        <h1 className="login-title">Set New Password</h1>
                        <p className="login-subtitle">
                            Please create a secure password for your account
                        </p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        {error && (
                            <div className="alert alert-error">
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="newPassword">
                                New Password
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    id="newPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="confirmPassword">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                className={`form-input ${confirmPassword && newPassword !== confirmPassword ? 'error' : ''
                                    }`}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="form-error">Passwords do not match</p>
                            )}
                        </div>

                        {/* Password Requirements */}
                        <div className="password-requirements">
                            {passwordRequirements.map((req, index) => (
                                <div
                                    key={index}
                                    className={`requirement ${req.met ? 'met' : ''}`}
                                >
                                    <Shield size={14} />
                                    <span>{req.text}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={loading || !allRequirementsMet || newPassword !== confirmPassword}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="spinner" />
                                    Updating...
                                </>
                            ) : (
                                'Set Password'
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>
                            Protected by <strong>ComplyArk</strong> • DPDPA Compliant
                        </p>
                    </div>
                </div>
            </div>

            <div className="login-background">
                <div className="bg-shape shape-1"></div>
                <div className="bg-shape shape-2"></div>
                <div className="bg-shape shape-3"></div>
            </div>

            <style>{`
        .password-requirements {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2);
          margin-bottom: var(--spacing-6);
          padding: var(--spacing-4);
          background: var(--color-gray-50);
          border-radius: var(--radius-lg);
        }
        
        .requirement {
          display: flex;
          align-items: center;
          gap: var(--spacing-2);
          font-size: var(--font-size-sm);
          color: var(--color-gray-400);
        }
        
        .requirement.met {
          color: var(--color-success-600);
        }
      `}</style>
        </div>
    );
}
