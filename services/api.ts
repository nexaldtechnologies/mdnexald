import { supabase } from './supabaseClient';

export function getApiBaseUrl(): string {
    // 1) Try env override (for tests / tools)
    const fromEnv =
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_BACKEND_URL ||
        '';

    if (fromEnv) return fromEnv.replace(/\/$/, '');

    // 2) Browser: use current origin (same domain as frontend)
    if (typeof window !== 'undefined' && window.location.origin) {
        return window.location.origin.replace(/\/$/, '');
    }

    // 3) Fallback for SSR / node: assume https://www.mdnexa.com
    return 'https://www.mdnexa.com';
}

export async function apiFetch(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    const base = getApiBaseUrl();
    const url = path.startsWith('http')
        ? path
        : `${base}${path.startsWith('/') ? path : '/' + path}`;

    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        credentials: 'include',
    });
}

export async function apiRequest(
    path: string,
    method: string = 'GET',
    body?: any,
    customToken?: string
): Promise<any> {
    try {
        // Get the current session or use custom token
        let token = customToken;
        if (!token) {
            const { data: { session } } = await supabase.auth.getSession();
            token = session?.access_token;
        }

        // Prepare headers
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Prepare request options
        const options: RequestInit = {
            method,
            headers,
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        // Make the request using apiFetch
        const response = await apiFetch(path, options);

        // Parse response
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Request failed with status ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}
