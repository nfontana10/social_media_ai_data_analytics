export type Recommendation = {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
  createdAt: string; // ISO
};

export type SavePayload = {
  userId: string;
  items: Recommendation[];
  updatedAt: string; // ISO
};

export type ToastType = 'success' | 'error' | 'info';

export interface Store {
  get(userId: string): Promise<SavePayload | null>;
  put(doc: SavePayload): Promise<void>;
}
