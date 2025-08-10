import './styles.css';
import { store } from './state/store';
import { generateMockInfo } from './services/generator';
import { exportAsTxt, exportAsPdf } from './services/exporter';
import type { Recommendation } from './types';

class App {
  private searchInput!: HTMLInputElement;
  private savedCount!: HTMLElement;
  private savedItems!: HTMLElement;
  private modal!: HTMLElement;
  private modalContent!: HTMLElement;
  private modalTitle!: HTMLElement;
  private toast!: HTMLElement;
  private toastMessage!: HTMLElement;
  private sidebar!: HTMLElement;
  private sidebarToggle!: HTMLElement;
  private currentModalItem: Recommendation | null = null;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.loadCheatsheet();
    this.renderSavedItems();
    this.subscribeToStore();
  }

  private initializeElements(): void {
    this.searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.savedCount = document.getElementById('saved-count') as HTMLElement;
    this.savedItems = document.getElementById('saved-items') as HTMLElement;
    this.modal = document.getElementById('modal') as HTMLElement;
    this.modalContent = document.getElementById('modal-content') as HTMLElement;
    this.modalTitle = document.getElementById('modal-title') as HTMLElement;
    this.toast = document.getElementById('toast') as HTMLElement;
    this.toastMessage = document.getElementById('toast-message') as HTMLElement;
    this.sidebar = document.getElementById('sidebar') as HTMLElement;
    this.sidebarToggle = document.getElementById('sidebar-toggle') as HTMLElement;
    
    // Ensure modal is hidden on initialization
    if (this.modal) {
      this.modal.hidden = true;
    }
  }

  private setupEventListeners(): void {
    // Search functionality
    this.searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));

    // Export buttons
    document.getElementById('export-txt-btn')?.addEventListener('click', this.handleExportTxt.bind(this));
    document.getElementById('export-pdf-btn')?.addEventListener('click', this.handleExportPdf.bind(this));

    // Sidebar toggle
    this.sidebarToggle.addEventListener('click', this.toggleSidebar.bind(this));

    // Modal events
    document.getElementById('modal-close')?.addEventListener('click', this.closeModal.bind(this));
    document.getElementById('save-note-btn')?.addEventListener('click', this.handleSaveNote.bind(this));

    // Clear all button
    document.getElementById('clear-all-btn')?.addEventListener('click', this.handleClearAll.bind(this));

    // Keyboard events
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // Modal overlay click
    this.modal.querySelector('.modal-overlay')?.addEventListener('click', this.closeModal.bind(this));
  }

  private loadCheatsheet(): void {
    fetch('./cheatsheet.html')
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const body = doc.body;
        
        // Extract the main content (everything except the DOCTYPE, html, head, body tags)
        const content = body.innerHTML;
        
        const cheatsheetRoot = document.getElementById('cheatsheet-root');
        if (cheatsheetRoot) {
          cheatsheetRoot.innerHTML = content;
          this.addActionButtons();
        }
      })
      .catch(error => {
        console.error('Failed to load cheatsheet:', error);
        this.showToast('Failed to load cheatsheet content', 'error');
      });
  }

  private addActionButtons(): void {
    const tableRows = document.querySelectorAll('#cheatsheet-root table tr');
    
    tableRows.forEach((row, index) => {
      if (index === 0) return; // Skip header row
      
      const cells = row.querySelectorAll('td');
      if (cells.length === 0) return;
      
      const firstCell = cells[0];
      const link = firstCell.querySelector('a');
      if (!link) return;
      
      const title = link.textContent?.trim() || '';
      const url = link.getAttribute('href') || '';
      
      // Create action buttons container
      const actionButtons = document.createElement('div');
      actionButtons.className = 'action-buttons';
      
      // Save button
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary btn-small';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => this.handleSave(title, url));
      
      // More info button
      const infoBtn = document.createElement('button');
      infoBtn.className = 'btn btn-secondary btn-small';
      infoBtn.textContent = 'More info';
      infoBtn.addEventListener('click', () => this.showMoreInfo(title, url));
      
      actionButtons.appendChild(saveBtn);
      actionButtons.appendChild(infoBtn);
      
      // Add to the last cell
      const lastCell = cells[cells.length - 1];
      lastCell.appendChild(actionButtons);
    });
  }

  private handleSearch(): void {
    const query = this.searchInput.value.toLowerCase();
    const tableRows = document.querySelectorAll('#cheatsheet-root table tr');
    
    tableRows.forEach((row, index) => {
      if (index === 0) return; // Skip header row
      
      const cells = row.querySelectorAll('td');
      const text = Array.from(cells).map(cell => cell.textContent || '').join(' ').toLowerCase();
      
      if (query === '' || text.includes(query)) {
        (row as HTMLElement).style.display = '';
        this.highlightText(row as HTMLElement, query);
      } else {
        (row as HTMLElement).style.display = 'none';
      }
    });
  }

  private highlightText(element: HTMLElement, query: string): void {
    if (!query) return;
    
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const highlightedText = text.replace(regex, '<span class="highlight">$1</span>');
      
      if (highlightedText !== text) {
        const span = document.createElement('span');
        span.innerHTML = highlightedText;
        textNode.parentNode?.replaceChild(span, textNode);
      }
    });
  }

  private handleSave(title: string, url?: string): void {
    const success = store.addItem({ title, url });
    
    if (success) {
      this.showToast('Item saved successfully!', 'success');
    } else {
      this.showToast('Item already saved', 'info');
    }
  }

  private showMoreInfo(title: string, url?: string): void {
    this.currentModalItem = { id: '', title, url, createdAt: new Date().toISOString() };
    this.modalTitle.textContent = title;
    this.modalContent.innerHTML = generateMockInfo(title, url);
    this.openModal();
  }

  private handleSaveNote(): void {
    if (this.currentModalItem) {
      const success = store.addItem(this.currentModalItem);
      if (success) {
        this.showToast('Note saved successfully!', 'success');
        this.closeModal();
      } else {
        this.showToast('Note already saved', 'info');
      }
    }
  }

  private handleExportTxt(): void {
    const items = store.getItems();
    if (items.length === 0) {
      this.showToast('No items to export', 'info');
      return;
    }
    
    try {
      exportAsTxt(items);
      this.showToast('TXT export completed!', 'success');
    } catch (error) {
      this.showToast('Export failed', 'error');
    }
  }

  private handleExportPdf(): void {
    const items = store.getItems();
    if (items.length === 0) {
      this.showToast('No items to export', 'info');
      return;
    }
    
    try {
      exportAsPdf(items);
      this.showToast('PDF export completed!', 'success');
    } catch (error) {
      this.showToast('Export failed', 'error');
    }
  }

  private handleClearAll(): void {
    if (confirm('Are you sure you want to clear all saved items?')) {
      store.clearAll();
      this.showToast('All items cleared', 'success');
    }
  }

  private toggleSidebar(): void {
    this.sidebar.classList.toggle('open');
  }

  private openModal(): void {
    this.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    
    // Focus trap
    const focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    firstElement?.focus();
    
    // Handle tab navigation (only add once)
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };
    
    // Remove any existing listener and add new one
    this.modal.removeEventListener('keydown', handleTabKey);
    this.modal.addEventListener('keydown', handleTabKey);
  }

  private closeModal(): void {
    this.modal.hidden = true;
    document.body.style.overflow = '';
    this.currentModalItem = null;
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !this.modal.hidden) {
      this.closeModal();
    }
  }

  private renderSavedItems(): void {
    const items = store.getItems();
    this.savedCount.textContent = items.length.toString();
    
    if (items.length === 0) {
      this.savedItems.innerHTML = '<p style="text-align: center; color: #6c757d;">No saved items yet</p>';
      return;
    }
    
    this.savedItems.innerHTML = items.map(item => `
      <div class="saved-item">
        <h4>${this.escapeHtml(item.title)}</h4>
        ${item.url ? `<p><a href="${item.url}" target="_blank" rel="noopener">${this.escapeHtml(item.url)}</a></p>` : ''}
        ${item.snippet ? `<p>${this.escapeHtml(item.snippet)}</p>` : ''}
        <p><small>Saved: ${new Date(item.createdAt).toLocaleDateString()}</small></p>
        <div class="item-actions">
          <button class="btn btn-danger btn-small" onclick="app.removeItem('${item.id}')">Remove</button>
        </div>
      </div>
    `).join('');
  }

  removeItem(id: string): void {
    store.removeItem(id);
    this.showToast('Item removed', 'success');
  }

  private subscribeToStore(): void {
    store.subscribe(() => {
      this.renderSavedItems();
    });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage.textContent = message;
    this.toast.className = `toast ${type}`;
    this.toast.hidden = false;
    
    setTimeout(() => {
      this.toast.hidden = true;
    }, 3000);
  }

  private debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => func(...args), wait);
    };
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app and make it globally available for inline event handlers
declare global {
  interface Window {
    app: App;
  }
}

const app = new App();
window.app = app;
