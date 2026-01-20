import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isLoading = false,
    variant = 'danger'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: '#dc2626',
            confirmBg: '#dc2626',
            confirmHover: '#b91c1c',
        },
        warning: {
            icon: '#f59e0b',
            confirmBg: '#f59e0b',
            confirmHover: '#d97706',
        },
        info: {
            icon: '#3b82f6',
            confirmBg: '#3b82f6',
            confirmHover: '#2563eb',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                backdropFilter: 'blur(4px)',
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '24px',
                    maxWidth: '400px',
                    width: '90%',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    animation: 'modalSlideIn 0.2s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                    <div
                        style={{
                            background: variant === 'danger' ? '#fef2f2' : variant === 'warning' ? '#fffbeb' : '#eff6ff',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <AlertTriangle size={24} color={styles.icon} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
                            {title}
                        </h3>
                        <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            color: '#9ca3af',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        style={{
                            background: '#fff',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        style={{
                            background: styles.confirmBg,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.7 : 1,
                            transition: 'all 0.15s',
                        }}
                    >
                        {isLoading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
