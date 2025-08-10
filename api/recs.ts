import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SavePayload, Store } from '../src/types';

// Storage adapter interface
interface StorageAdapter {
  get(userId: string): Promise<SavePayload | null>;
  put(doc: SavePayload): Promise<void>;
}

// Vercel KV adapter
class VercelKVAdapter implements StorageAdapter {
  async get(userId: string): Promise<SavePayload | null> {
    if (!process.env.KV_URL || !process.env.KV_TOKEN) {
      throw new Error('KV credentials not configured');
    }

    const response = await fetch(`${process.env.KV_URL}/get/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.KV_TOKEN}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`KV get failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result ? JSON.parse(data.result) : null;
  }

  async put(doc: SavePayload): Promise<void> {
    if (!process.env.KV_URL || !process.env.KV_TOKEN) {
      throw new Error('KV credentials not configured');
    }

    const response = await fetch(`${process.env.KV_URL}/set/${doc.userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: JSON.stringify(doc),
        ex: 60 * 60 * 24 * 365, // 1 year expiry
      }),
    });

    if (!response.ok) {
      throw new Error(`KV put failed: ${response.status}`);
    }
  }
}

// Vercel Blob adapter
class VercelBlobAdapter implements StorageAdapter {
  async get(userId: string): Promise<SavePayload | null> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('Blob token not configured');
    }

    try {
      const { get } = await import('@vercel/blob');
      const blob = await get(`recs/${userId}.json`);
      
      if (!blob) return null;
      
      const response = await fetch(blob.url);
      if (!response.ok) return null;
      
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  async put(doc: SavePayload): Promise<void> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('Blob token not configured');
    }

    const { put } = await import('@vercel/blob');
    await put(`recs/${doc.userId}.json`, JSON.stringify(doc), {
      access: 'public',
    });
  }
}

// In-memory adapter (dev only)
class MemoryAdapter implements StorageAdapter {
  private store = new Map<string, SavePayload>();

  async get(userId: string): Promise<SavePayload | null> {
    return this.store.get(userId) || null;
  }

  async put(doc: SavePayload): Promise<void> {
    this.store.set(doc.userId, doc);
  }
}

// Adapter factory
function createAdapter(): StorageAdapter {
  const provider = process.env.STORE_PROVIDER || 'memory';
  
  switch (provider) {
    case 'kv':
      return new VercelKVAdapter();
    case 'blob':
      return new VercelBlobAdapter();
    case 'memory':
      return new MemoryAdapter();
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}

// Validation
function validateSavePayload(data: any): data is SavePayload {
  return (
    typeof data === 'object' &&
    typeof data.userId === 'string' &&
    Array.isArray(data.items) &&
    typeof data.updatedAt === 'string' &&
    data.items.every((item: any) => 
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.createdAt === 'string'
    )
  );
}

// Rate limiting (simple in-memory)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60 * 1000; // 1 minute
  const limit = 100; // requests per minute

  const record = rateLimit.get(ip);
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + window });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp as string)) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  try {
    const adapter = createAdapter();

    if (req.method === 'GET') {
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'userId parameter required' });
        return;
      }

      const data = await adapter.get(userId);
      
      if (!data) {
        // Return empty payload for new users
        res.status(200).json({
          userId,
          items: [],
          updatedAt: new Date().toISOString()
        });
        return;
      }

      res.status(200).json(data);
    } else if (req.method === 'POST') {
      const payload = req.body;

      if (!validateSavePayload(payload)) {
        res.status(400).json({ error: 'Invalid payload format' });
        return;
      }

      // Validate size limits
      if (payload.items.length > 200) {
        res.status(400).json({ error: 'Too many items (max 200)' });
        return;
      }

      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > 1024 * 1024) { // 1MB limit
        res.status(400).json({ error: 'Payload too large (max 1MB)' });
        return;
      }

      await adapter.put(payload);
      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
