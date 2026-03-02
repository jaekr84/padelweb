"use client";

import { useState } from "react";
import s from "./invite.module.css";

interface InviteModalProps {
    clubName: string;
    clubId: string;
    onClose: () => void;
}

export function InviteModal({ clubName, clubId, onClose }: InviteModalProps) {
    const [copied, setCopied] = useState(false);

    // Basic invite link formulation
    // the '?invite=' parameter will be read on the sign-up page later
    // In a real deployed app you'd definitely use an env var for the base URL,
    // but here we can dynamically construct it using window.location.origin
    const inviteLink = typeof window !== 'undefined'
        ? `${window.location.origin}/sign-up?invite=${clubId}`
        : `https://padelweb.app/sign-up?invite=${clubId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        const message = `¡Hola! Sumate a mi club "${clubName}" en PadelWeb haciendo clic acá: ${inviteLink}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={s.modal} style={{ maxWidth: '400px' }}>

                {/* Header */}
                <div className={s.modalHeader}>
                    <div>
                        <div className={s.modalTitle}>✉️ Invitar Jugadores</div>
                        <div className={s.modalSub}>{clubName}</div>
                    </div>
                    <button className={s.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div className={s.modalBody} style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--foreground)' }}>Link de Invitación</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        Compartí este link con tus jugadores. Cuando se registren, quedarán asociados a tu club automáticamente.
                    </p>

                    {/* Link Box */}
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--background)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', padding: '0.5rem', marginBottom: '1.5rem', overflow: 'hidden' }}>
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {inviteLink}
                        </div>
                        <button
                            onClick={handleCopy}
                            style={{ background: copied ? 'var(--positive, #10b981)' : 'var(--surface-border)', color: copied ? 'white' : 'var(--foreground)', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.25rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', marginLeft: '0.5rem' }}
                        >
                            {copied ? '¡Copiado!' : 'Copiar'}
                        </button>
                    </div>

                    {/* WhatsApp Button */}
                    <button
                        onClick={handleWhatsApp}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', background: '#25D366', color: 'white', border: 'none', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'filter 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                            <path d="M11.995 1C5.922 1 1 5.921 1 11.992c0 1.933.504 3.793 1.464 5.438L1 23l5.702-1.493A10.941 10.941 0 0 0 11.995 23c6.071 0 10.995-4.92 10.995-10.991C22.99 5.92 18.066 1 11.995 1Zm5.845 15.541c-.247.697-1.432 1.341-1.956 1.4-1.892.203-4.329-1.077-6.22-2.957-1.894-1.884-3.212-4.295-2.97-6.223.05-.41.528-1.527.974-1.527.135 0 .284.004.417.01.2.008.471-.077.737.558.272.651.936 2.29.98 2.38.042.083.081.205.006.353-.075.148-.114.24-.225.352-.112.112-.236.252-.338.353-.11.114-.226.241-.098.463.128.22 568 1.002 568 1.002.5.836 1.45 1.532 2.052 1.844.202.105.356.124.496.06.155-.07.419-.481.657-.905.155-.276.312-.206.529-.126.216.082 1.373.65 1.61.765.234.114.391.171.448.266.057.094.057.54-.19 1.237Z" />
                        </svg>
                        Compartir por WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
}
