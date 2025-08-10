import type { SavePayload } from '../types';

const API_BASE = '/api';

export async function getRecs(userId: string): Promise<SavePayload | null> {
  try {
    const response = await fetch(`${API_BASE}/recs?userId=${encodeURIComponent(userId)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    return null;
  }
}

export async function putRecs(payload: SavePayload): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/recs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to save recommendations:', error);
    throw error;
  }
}
