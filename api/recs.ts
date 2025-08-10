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
    console.log(`Getting data for userId: ${userId}`);
    const result = this.store.get(userId) || null;
    console.log(`Found data:`, result);
    return result;
  }

  async put(doc: SavePayload): Promise<void> {
    console.log(`Storing data for userId: ${doc.userId}`, doc);
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
  console.log(`API Request: ${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    res.status(200).end();
    return;
  }

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    console.log(`Rate limit exceeded for IP: ${clientIp}`);
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  const adapter = new MemoryAdapter();

  try {
    if (req.method === 'GET') {
      const { userId } = req.query;
      console.log(`GET request for userId: ${userId}`);
      
      if (!userId || typeof userId !== 'string') {
        console.log('Invalid userId parameter');
        res.status(400).json({ error: 'userId parameter required' });
        return;
      }

      const data = await adapter.get(userId);
      const response = data || { userId, items: [], updatedAt: new Date().toISOString() };
      console.log(`Sending response:`, response);
      res.status(200).json(response);
    } else if (req.method === 'POST') {
      const payload = req.body;
      console.log(`POST request with payload:`, payload);
      
      if (!validateSavePayload(payload)) {
        console.log('Invalid payload format');
        res.status(400).json({ error: 'Invalid payload format' });
        return;
      }

      if (payload.items.length > 200) {
        console.log('Too many items');
        res.status(400).json({ error: 'Too many items (max 200)' });
        return;
      }

      await adapter.put(payload);
      console.log('Data stored successfully');
      res.status(200).json({ success: true });
    } else {
      console.log(`Method not allowed: ${req.method}`);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
