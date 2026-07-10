const DEFAULT_BACKEND_HOST = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5004';
const BACKEND_URL = import.meta.env.VITE_API_URL || DEFAULT_BACKEND_HOST;

export const API_BASE = `${BACKEND_URL.replace(/\/$/, '')}/api/games`;
export const SOCKET_BASE = BACKEND_URL.replace(/\/$/, '');

if (typeof window !== 'undefined') {
  console.log('[API] VITE_API_URL=', import.meta.env.VITE_API_URL);
  console.log('[API] USING BACKEND URL=', BACKEND_URL);
  console.log('[API] API_BASE=', API_BASE);
}
