const fs = require('fs');
const file = 'src/app/profiles/club/ClubProfileClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file got completely mangled from multiple replace passes. Re-writing the end section.
const cleanEnd = `
                            {/* ── Right sidebar ── */}
                            <div>
                                {/* Servicios */}
                                {club?.amenities && club.amenities.length > 0 && (
                                    <div className={styles.section}>
                                        <div className={styles.sectionHeader}>🛎️ Servicios</div>
                                        <div className={styles.sectionBody}>
                                            <div className={styles.tags}>
                                                {club.amenities.map((s: string) => (
                                                    <span key={s} className={styles.tag}>{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>

        {showInvite && (
            <InviteModal clubId={club?.id || user?.id} clubName={clubName} onClose={() => setShowInvite(false)} />
        )}
    </>
    );
}`;

content = content.replace(/\{\/\* ── Right sidebar ── \*\/\}[\s\S]*$/, cleanEnd);
fs.writeFileSync(file, content);
