import { supabase } from './supabaseClient';

const API_BASE_PATH = '/api';

export function buildApiUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_PATH}${cleanPath}`;
}

export async function apiFetch<T = any>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const url = buildApiUrl(path);
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        let payload: any = null;
        let rawText = '';
        try {
            rawText = await res.text();
            payload = JSON.parse(rawText);
        } catch {
            // If JSON fails, usage rawText is fallback
        }

        const message = payload?.message || payload?.error || `API error ${res.status}: ${rawText.substring(0, 200)}`;
        const error = new Error(message);
        (error as any).status = res.status;
        (error as any).code = payload?.error || payload?.code;

        console.error(`[API] ${options.method || 'GET'} ${path} failed:`, message);
        throw error;
    }

    try {
        return (await res.json()) as T;
    } catch {
        return null as T;
    }
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

            // FALLBACK: If Supabase session is null (sometimes slow init), try localStorage manual backup
            if (!token) {
                console.warn('[API] Auth Session missing, checking localStorage...');
                token = localStorage.getItem('token') || undefined;
            }
        }

        if (!token) {
            console.warn('[API] No token found in session or localStorage. Request may fail 401.');
        } else {
            // console.log('[API] Token attached.'); // verbose
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
        // apiFetch returns T (the data) directly now.
        return await apiFetch(path, options);

    } catch (error) {
        // console.error('API Request Error:', error); // Silenced to reduce noise
        throw error;
    }
}
