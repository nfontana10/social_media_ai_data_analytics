import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SavePayload } from '../src/types';

// Storage adapter interface
interface StorageAdapter {
  get(userId: string): Promise<SavePayload | null>;
  put(doc: SavePayload): Promise<void>;
}

// In-memory adapter (simple and reliable)
class MemoryAdapter implements StorageAdapter {
  private store = new Map<string, SavePayload>();

  async get(userId: string): Promise<SavePayload | null> {
    return this.store.get(userId) || null;
  }

  async put(doc: SavePayload): Promise<void> {
    this.store.set(doc.userId, doc);
  }
}

// Simple rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (limit.count >= 10) { // 10 requests per minute
    return false;
  }
  
  limit.count++;
  return true;
}

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
  const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  const adapter = new MemoryAdapter();

  try {
    if (req.method === 'GET') {
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'userId parameter required' });
        return;
      }

      const data = await adapter.get(userId);
      res.status(200).json(data || { userId, items: [], updatedAt: new Date().toISOString() });
    } else if (req.method === 'POST') {
      const payload = req.body;
      
      if (!validateSavePayload(payload)) {
        res.status(400).json({ error: 'Invalid payload format' });
        return;
      }

      if (payload.items.length > 200) {
        res.status(400).json({ error: 'Too many items (max 200)' });
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
