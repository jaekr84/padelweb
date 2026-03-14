export { };

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            role?: 'superadmin' | 'club' | 'jugador';
        };
    }
}
