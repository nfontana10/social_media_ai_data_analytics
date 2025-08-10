import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import type { SavePayload } from '../../src/types';

// Storage adapter interface
interface StorageAdapter {
  get(userId: string): Promise<SavePayload | null>;
  put(doc: SavePayload): Promise<void>;
}

// Netlify Blobs adapter
class NetlifyBlobsAdapter implements StorageAdapter {
  async get(userId: string): Promise<SavePayload | null> {
    if (!process.env.NETLIFY_BLOBS_TOKEN) {
      throw new Error('Netlify Blobs token not configured');
    }

    try {
      const { get } = await import('@netlify/blobs');
      const blob = await get('recommendations', userId);
      
      if (!blob) return null;
      
      return JSON.parse(blob);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  async put(doc: SavePayload): Promise<void> {
    if (!process.env.NETLIFY_BLOBS_TOKEN) {
      throw new Error('Netlify Blobs token not configured');
    }

    const { set } = await import('@netlify/blobs');
    await set('recommendations', doc.userId, JSON.stringify(doc), {
      ttl: 60 * 60 * 24 * 365, // 1 year expiry
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
    case 'blobs':
      return new NetlifyBlobsAdapter();
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

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Rate limiting
  const clientIp = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  if (!checkRateLimit(clientIp as string)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: 'Rate limit exceeded' }),
    };
  }

  try {
    const adapter = createAdapter();

    if (event.httpMethod === 'GET') {
      const userId = event.queryStringParameters?.userId;
      
      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'userId parameter required' }),
        };
      }

      const data = await adapter.get(userId);
      
      if (!data) {
        // Return empty payload for new users
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            userId,
            items: [],
            updatedAt: new Date().toISOString()
          }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    } else if (event.httpMethod === 'POST') {
      const payload = JSON.parse(event.body || '{}');

      if (!validateSavePayload(payload)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid payload format' }),
        };
      }

      // Validate size limits
      if (payload.items.length > 200) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Too many items (max 200)' }),
        };
      }

      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > 1024 * 1024) { // 1MB limit
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Payload too large (max 1MB)' }),
        };
      }

      await adapter.put(payload);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
  } catch (error) {
    console.error('API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
