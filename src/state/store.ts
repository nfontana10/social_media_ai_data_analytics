import { v4 as uuidv4 } from 'uuid';
import type { Recommendation, SavePayload } from '../types';
import { getRecs, putRecs } from '../services/api';

class Store {
  private items: Recommendation[] = [];
  private userId: string;
  private syncTimeout: number | null = null;
  private lastPayload: SavePayload | null = null;

  constructor() {
    this.userId = this.getOrCreateUserId();
    this.loadFromLocalStorage();
    this.syncWithBackend();
    this.setupEventListeners();
  }

  private getOrCreateUserId(): string {
    let userId = localStorage.getItem('app.userId');
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('app.userId', userId);
    }
    return userId;
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem('app.savedRecommendations');
    if (stored) {
      try {
        this.items = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse stored recommendations:', error);
        this.items = [];
      }
    }
  }

  private saveToLocalStorage(): void {
    localStorage.setItem('app.savedRecommendations', JSON.stringify(this.items));
  }

  private async syncWithBackend(): Promise<void> {
    try {
      const backendData = await getRecs(this.userId);
      if (backendData) {
        this.mergeWithBackend(backendData);
      }
    } catch (error) {
      console.error('Failed to sync with backend:', error);
    }
  }

  private mergeWithBackend(backendData: SavePayload): void {
    const localUpdatedAt = this.getLastUpdatedAt();
    const backendUpdatedAt = new Date(backendData.updatedAt).getTime();

    if (backendUpdatedAt > localUpdatedAt) {
      // Backend is newer, merge and deduplicate
      const merged = this.mergeItems(this.items, backendData.items);
      this.items = merged;
      this.saveToLocalStorage();
      this.notifyListeners();
    }
  }

  private mergeItems(local: Recommendation[], backend: Recommendation[]): Recommendation[] {
    const seen = new Set<string>();
    const merged: Recommendation[] = [];

    // Add all items, using title + url as unique key
    [...local, ...backend].forEach(item => {
      const key = `${item.title}${item.url || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    });

    // Sort by creation date, newest first
    return merged.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private getLastUpdatedAt(): number {
    if (this.items.length === 0) return 0;
    return Math.max(...this.items.map(item => new Date(item.createdAt).getTime()));
  }

  private debouncedSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = window.setTimeout(() => {
      this.performSync();
    }, 500);
  }

  private async performSync(): Promise<void> {
    const payload: SavePayload = {
      userId: this.userId,
      items: this.items,
      updatedAt: new Date().toISOString()
    };

    this.lastPayload = payload;

    try {
      await putRecs(payload);
    } catch (error) {
      console.error('Failed to sync with backend:', error);
      // Queue for retry
      this.queueForRetry();
    }
  }

  private queueForRetry(): void {
    // Store the last payload for retry
    localStorage.setItem('app.pendingSync', JSON.stringify(this.lastPayload));
  }

  private async retryPendingSync(): Promise<void> {
    const pending = localStorage.getItem('app.pendingSync');
    if (pending && this.lastPayload) {
      try {
        await putRecs(this.lastPayload);
        localStorage.removeItem('app.pendingSync');
      } catch (error) {
        console.error('Retry sync failed:', error);
      }
    }
  }

  private setupEventListeners(): void {
    // Retry sync when coming back online
    window.addEventListener('online', () => {
      this.retryPendingSync();
    });

    // Retry sync when window gains focus
    window.addEventListener('focus', () => {
      this.retryPendingSync();
    });
  }

  // Public API
  getItems(): Recommendation[] {
    return [...this.items];
  }

  addItem(item: Omit<Recommendation, 'id' | 'createdAt'>): boolean {
    const key = `${item.title}${item.url || ''}`;
    const exists = this.items.some(existing => 
      `${existing.title}${existing.url || ''}` === key
    );

    if (exists) {
      return false; // Already exists
    }

    const newItem: Recommendation = {
      ...item,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };

    this.items.unshift(newItem);
    this.saveToLocalStorage();
    this.debouncedSync();
    this.notifyListeners();
    return true;
  }

  removeItem(id: string): void {
    this.items = this.items.filter(item => item.id !== id);
    this.saveToLocalStorage();
    this.debouncedSync();
    this.notifyListeners();
  }

  clearAll(): void {
    this.items = [];
    this.saveToLocalStorage();
    this.debouncedSync();
    this.notifyListeners();
  }

  // Observer pattern for UI updates
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Create singleton instance
export const store = new Store();
