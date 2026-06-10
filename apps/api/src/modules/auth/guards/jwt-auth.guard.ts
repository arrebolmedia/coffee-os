// Re-export the global JwtAuthGuard (the one that honors @Public()).
// We keep this file so existing imports of './jwt-auth.guard' continue to work
// without duplicating implementations.
export { JwtAuthGuard } from './jwt-auth.guard.global';
