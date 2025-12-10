import { supabase } from './supabaseClient';

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

        // Make the request
        const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}${path}`,
            options
        );

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
