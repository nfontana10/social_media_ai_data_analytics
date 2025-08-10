import { store } from './state/store.js';
import { generateMockInfo } from './services/generator.js';
import { exportAsTxt, exportAsPdf } from './services/exporter.js';

interface Recommendation {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
  createdAt: string;
}

interface ToolData {
  name: string;
  description: string;
  pricing: string;
  platforms: string[];
  useCases: string[];
  businessSize: string[];
  tourismFocus: string[];
  rating: number;
  popularity: number;
  features: string[];
  limitations: string;
  bestFor: string;
  url: string;
}

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
  
  // New filter elements
  private advancedFiltersToggle!: HTMLElement;
  private advancedFilters!: HTMLElement;
  private pricingFilter!: HTMLSelectElement;
  private platformFilter!: HTMLSelectElement;
  private usecaseFilter!: HTMLSelectElement;
  private businessSizeFilter!: HTMLSelectElement;
  private tourismFilter!: HTMLSelectElement;
  private sortFilter!: HTMLSelectElement;
  private clearFiltersBtn!: HTMLElement;
  private applyFiltersBtn!: HTMLElement;
  
  // Comparison elements
  private compareToolsBtn!: HTMLElement;
  private comparisonModal!: HTMLElement;
  private comparisonModalContent!: HTMLElement;
  private closeComparisonModalBtn!: HTMLElement;
  
  // State
  private selectedTools: ToolData[] = [];
  private currentFilters: any = {};

  constructor() {
    try {
      console.log('Initializing app...');
      this.initializeElements();
      this.setupEventListeners();
      this.loadCheatsheet();
      this.subscribeToStore();
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Error initializing app:', error);
    }
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
    
    // Filter elements
    this.advancedFiltersToggle = document.getElementById('advanced-filters-toggle') as HTMLElement;
    this.advancedFilters = document.getElementById('advanced-filters') as HTMLElement;
    this.pricingFilter = document.getElementById('pricing-filter') as HTMLSelectElement;
    this.platformFilter = document.getElementById('platform-filter') as HTMLSelectElement;
    this.usecaseFilter = document.getElementById('usecase-filter') as HTMLSelectElement;
    this.businessSizeFilter = document.getElementById('business-size-filter') as HTMLSelectElement;
    this.tourismFilter = document.getElementById('tourism-filter') as HTMLSelectElement;
    this.sortFilter = document.getElementById('sort-filter') as HTMLSelectElement;
    this.clearFiltersBtn = document.getElementById('clear-filters') as HTMLElement;
    this.applyFiltersBtn = document.getElementById('apply-filters') as HTMLElement;
    
    // Comparison elements
    this.compareToolsBtn = document.getElementById('compare-tools-btn') as HTMLElement;
    this.comparisonModal = document.getElementById('comparison-modal') as HTMLElement;
    this.comparisonModalContent = document.getElementById('comparison-modal-content') as HTMLElement;
    this.closeComparisonModalBtn = document.getElementById('close-comparison-modal') as HTMLElement;
    
    this.modal.hidden = true;
  }

  private setupEventListeners(): void {
    // Search
    this.searchInput.addEventListener('input', this.debounce(() => this.handleSearch(), 300));
    
    // Filter toggles
    this.advancedFiltersToggle.addEventListener('click', () => this.toggleAdvancedFilters());
    this.clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
    this.applyFiltersBtn.addEventListener('click', () => this.applyFilters());
    
    // Comparison
    this.compareToolsBtn.addEventListener('click', () => this.openComparisonModal());
    this.closeComparisonModalBtn.addEventListener('click', () => this.closeComparisonModal());
    
    // Export buttons
    document.getElementById('export-txt')?.addEventListener('click', () => this.handleExportTxt());
    document.getElementById('export-pdf')?.addEventListener('click', () => this.handleExportPdf());
    
    // Sidebar
    this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
    
    // Modal
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Filter change events
    this.pricingFilter.addEventListener('change', () => this.handleFilterChange());
    this.platformFilter.addEventListener('change', () => this.handleFilterChange());
    this.usecaseFilter.addEventListener('change', () => this.handleFilterChange());
    this.businessSizeFilter.addEventListener('change', () => this.handleFilterChange());
    this.tourismFilter.addEventListener('change', () => this.handleFilterChange());
    this.sortFilter.addEventListener('change', () => this.handleFilterChange());
  }

  private loadCheatsheet(): void {
    this.addActionButtons();
  }

  private addActionButtons(): void {
    try {
      console.log('Adding action buttons...');
      const tableRows = document.querySelectorAll('#cheatsheet-root table tr');
      console.log('Found table rows:', tableRows.length);
      
      tableRows.forEach((row, index) => {
        if (index === 0) return; // Skip header row
        
        const cells = row.querySelectorAll('td');
        if (cells.length === 0) return;
        
        const firstCell = cells[0];
        const link = firstCell.querySelector('a');
        if (!link) return;
        
        const title = link.textContent?.trim() || '';
        const url = link.getAttribute('href') || '';
        console.log('Processing row:', title);
        
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
        
        // Compare button
        const compareBtn = document.createElement('button');
        compareBtn.className = 'btn btn-success btn-small';
        compareBtn.textContent = 'Compare';
        compareBtn.addEventListener('click', () => this.addToComparison(row));
        
        actionButtons.appendChild(saveBtn);
        actionButtons.appendChild(infoBtn);
        actionButtons.appendChild(compareBtn);
        
        // Add to the last cell
        const lastCell = cells[cells.length - 1];
        lastCell.appendChild(actionButtons);
      });
      
      console.log('Action buttons added successfully');
    } catch (error) {
      console.error('Error adding action buttons:', error);
    }
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

  private toggleAdvancedFilters(): void {
    const isHidden = this.advancedFilters.hidden;
    this.advancedFilters.hidden = !isHidden;
    this.advancedFiltersToggle.textContent = isHidden ? 'Hide Filters' : 'Filters';
  }

  private handleFilterChange(): void {
    // Auto-apply filters after a short delay
    clearTimeout((this as any).filterTimeout);
    (this as any).filterTimeout = setTimeout(() => this.applyFilters(), 500);
  }

  private applyFilters(): void {
    const filters = {
      pricing: this.pricingFilter.value,
      platform: this.platformFilter.value,
      usecase: this.usecaseFilter.value,
      businessSize: this.businessSizeFilter.value,
      tourism: this.tourismFilter.value,
      sort: this.sortFilter.value
    };
    
    this.currentFilters = filters;
    this.filterTableRows(this.currentFilters);
    this.showToast('Filters applied', 'success');
  }

  private filterTableRows(filters: any): void {
    const tableRows = document.querySelectorAll('#cheatsheet-root table tr');
    
    tableRows.forEach((row, index) => {
      if (index === 0) return; // Skip header row
      
      let show = true;
      
      // Apply each filter
      if (filters.pricing && row.getAttribute('data-pricing') !== filters.pricing) {
        show = false;
      }
      
      if (filters.platform && !row.getAttribute('data-platform')?.includes(filters.platform)) {
        show = false;
      }
      
      if (filters.usecase && row.getAttribute('data-usecase') !== filters.usecase) {
        show = false;
      }
      
      if (filters.businessSize && row.getAttribute('data-business-size') !== filters.businessSize) {
        show = false;
      }
      
      if (filters.tourism && row.getAttribute('data-tourism') !== filters.tourism) {
        show = false;
      }
      
      (row as HTMLElement).style.display = show ? '' : 'none';
    });
    
    // Apply sorting
    this.sortTableRows(filters.sort);
  }

  private sortTableRows(sortBy: string): void {
    const table = document.querySelector('#cheatsheet-root table') as HTMLTableElement;
    if (!table) return;
    
    const tbody = table.querySelector('tbody') || table;
    const rows = Array.from(tbody.querySelectorAll('tr')).slice(1); // Skip header
    
    rows.sort((a, b) => {
      const aText = a.querySelector('td')?.textContent || '';
      const bText = b.querySelector('td')?.textContent || '';
      
      switch (sortBy) {
        case 'name':
          return aText.localeCompare(bText);
        case 'price-low':
          return this.extractPrice(a) - this.extractPrice(b);
        case 'price-high':
          return this.extractPrice(b) - this.extractPrice(a);
        case 'rating':
          return this.extractRating(b) - this.extractRating(a);
        case 'popularity':
          return this.extractPopularity(b) - this.extractPopularity(a);
        default:
          return 0;
      }
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
  }

  private extractPrice(row: Element): number {
    const priceCell = row.querySelectorAll('td')[3];
    const priceText = priceCell?.textContent || '';
    const match = priceText.match(/\$(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private extractRating(row: Element): number {
    // Mock rating based on tool name for demo
    const toolName = row.querySelector('td')?.textContent || '';
    const ratings: { [key: string]: number } = {
      'Rival IQ': 4.5,
      'Brandwatch': 4.8,
      'Mentionlytics': 4.2,
      'Meltwater': 4.6,
      'Socialinsider': 4.3,
      'SocialBee': 4.1,
      'Sprout Social': 4.7,
      'Hootsuite': 4.4,
      'Predis.ai': 3.9,
      'ContentStudio': 4.0,
      'Buffer': 3.8
    };
    return ratings[toolName] || 4.0;
  }

  private extractPopularity(row: Element): number {
    // Mock popularity based on tool name for demo
    const toolName = row.querySelector('td')?.textContent || '';
    const popularity: { [key: string]: number } = {
      'Hootsuite': 95,
      'Buffer': 90,
      'Sprout Social': 85,
      'Rival IQ': 80,
      'Brandwatch': 75,
      'Meltwater': 70,
      'SocialBee': 65,
      'Socialinsider': 60,
      'Mentionlytics': 55,
      'ContentStudio': 50,
      'Predis.ai': 45
    };
    return popularity[toolName] || 50;
  }

  private clearAllFilters(): void {
    this.pricingFilter.value = '';
    this.platformFilter.value = '';
    this.usecaseFilter.value = '';
    this.businessSizeFilter.value = '';
    this.tourismFilter.value = '';
    this.sortFilter.value = 'name';
    
    const tableRows = document.querySelectorAll('#cheatsheet-root table tr');
    tableRows.forEach((row, index) => {
      if (index === 0) return;
      (row as HTMLElement).style.display = '';
    });
    
    this.currentFilters = {};
    this.showToast('All filters cleared', 'info');
  }

  private addToComparison(row: Element): void {
    const cells = row.querySelectorAll('td');
    const toolData: ToolData = {
      name: cells[0]?.textContent?.trim() || '',
      description: cells[1]?.textContent?.trim() || '',
      pricing: cells[3]?.textContent?.trim() || '',
      platforms: row.getAttribute('data-platform')?.split(',') || [],
      useCases: [row.getAttribute('data-usecase') || ''],
      businessSize: [row.getAttribute('data-business-size') || ''],
      tourismFocus: [row.getAttribute('data-tourism') || ''],
      rating: this.extractRating(row),
      popularity: this.extractPopularity(row),
      features: this.extractFeatures(cells[1]?.textContent || ''),
      limitations: cells[2]?.textContent?.trim() || '',
      bestFor: cells[4]?.textContent?.trim() || '',
      url: (cells[0]?.querySelector('a') as HTMLAnchorElement)?.href || ''
    };
    
    const existingIndex = this.selectedTools.findIndex(tool => tool.name === toolData.name);
    if (existingIndex >= 0) {
      this.selectedTools.splice(existingIndex, 1);
      this.showToast(`${toolData.name} removed from comparison`, 'info');
    } else {
      if (this.selectedTools.length >= 3) {
        this.showToast('Maximum 3 tools can be compared at once', 'error');
        return;
      }
      this.selectedTools.push(toolData);
      this.showToast(`${toolData.name} added to comparison`, 'success');
    }
    
    this.updateComparisonContent();
  }

  private extractFeatures(description: string): string[] {
    const features = [];
    if (description.includes('competitor')) features.push('Competitor Analysis');
    if (description.includes('sentiment')) features.push('Sentiment Analysis');
    if (description.includes('trend')) features.push('Trend Detection');
    if (description.includes('AI')) features.push('AI Insights');
    if (description.includes('scheduling')) features.push('Scheduling');
    if (description.includes('listening')) features.push('Social Listening');
    return features;
  }

  private updateComparisonContent(): void {
    if (this.selectedTools.length === 0) {
      this.comparisonModalContent.innerHTML = '<p>Select tools to compare by clicking the "Compare" button on any tool row.</p>';
      return;
    }
    
    let html = '<div class="comparison-table-container">';
    html += '<table class="comparison-table">';
    html += '<tr><th>Feature</th>';
    this.selectedTools.forEach(tool => {
      html += `<th>${tool.name}</th>`;
    });
    html += '</tr>';
    
    // Add comparison rows
    const features = ['Pricing', 'Rating', 'Popularity', 'Platforms', 'Use Cases', 'Business Size', 'Tourism Focus'];
    
    features.forEach(feature => {
      html += `<tr><td><strong>${feature}</strong></td>`;
      this.selectedTools.forEach(tool => {
        let value = '';
        switch (feature) {
          case 'Pricing':
            value = tool.pricing;
            break;
          case 'Rating':
            value = `${tool.rating}/5.0`;
            break;
          case 'Popularity':
            value = `${tool.popularity}%`;
            break;
          case 'Platforms':
            value = tool.platforms.join(', ');
            break;
          case 'Use Cases':
            value = tool.useCases.join(', ');
            break;
          case 'Business Size':
            value = tool.businessSize.join(', ');
            break;
          case 'Tourism Focus':
            value = tool.tourismFocus.join(', ');
            break;
        }
        html += `<td>${value}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</table></div>';
    
    // Add action buttons
    html += '<div class="comparison-actions">';
    html += '<button class="btn btn-primary" onclick="app.exportComparison()">Export Comparison</button>';
    html += '<button class="btn btn-secondary" onclick="app.clearComparison()">Clear All</button>';
    html += '</div>';
    
    this.comparisonModalContent.innerHTML = html;
  }

  private openComparisonModal(): void {
    this.comparisonModal.hidden = false;
    document.body.style.overflow = 'hidden';
    
    // Focus management
    const focusableElements = this.comparisonModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    firstElement?.focus();
    
    // Focus trap
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
    
    this.comparisonModal.removeEventListener('keydown', handleTabKey);
    this.comparisonModal.addEventListener('keydown', handleTabKey);
    
    // Close on escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeComparisonModal();
      }
    };
    
    this.comparisonModal.addEventListener('keydown', handleEscape);
  }

  private closeComparisonModal(): void {
    this.comparisonModal.hidden = true;
    document.body.style.overflow = '';
    this.selectedTools = [];
    this.updateComparisonContent();
  }

  public exportComparison(): void {
    if (this.selectedTools.length === 0) {
      this.showToast('No tools selected for comparison', 'error');
      return;
    }
    
    const content = this.generateComparisonText();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tool-comparison.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('Comparison exported successfully', 'success');
  }

  private generateComparisonText(): string {
    let text = 'Social Media AI Analytics Tools Comparison\n';
    text += '=============================================\n\n';
    
    this.selectedTools.forEach(tool => {
      text += `${tool.name}\n`;
      text += `${'='.repeat(tool.name.length)}\n`;
      text += `Description: ${tool.description}\n`;
      text += `Pricing: ${tool.pricing}\n`;
      text += `Rating: ${tool.rating}/5.0\n`;
      text += `Popularity: ${tool.popularity}%\n`;
      text += `Platforms: ${tool.platforms.join(', ')}\n`;
      text += `Use Cases: ${tool.useCases.join(', ')}\n`;
      text += `Business Size: ${tool.businessSize.join(', ')}\n`;
      text += `Tourism Focus: ${tool.tourismFocus.join(', ')}\n`;
      text += `Best For: ${tool.bestFor}\n`;
      text += `Limitations: ${tool.limitations}\n`;
      text += `URL: ${tool.url}\n\n`;
    });
    
    return text;
  }

  public clearComparison(): void {
    this.selectedTools = [];
    this.updateComparisonContent();
    this.showToast('Comparison cleared', 'info');
  }

  private handleSave(title: string, url?: string): void {
    const success = store.addItem({ title, url });
    
    if (success) {
      this.showToast('Item saved successfully', 'success');
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

  public handleSaveNote(): void {
    if (this.currentModalItem) {
      const success = store.addItem(this.currentModalItem);
      if (success) {
        this.showToast('Note saved successfully', 'success');
        this.closeModal();
      } else {
        this.showToast('Note already saved', 'info');
      }
    }
  }

  private handleExportTxt(): void {
    const items = store.getItems();
    if (items.length === 0) {
      this.showToast('No saved items to export', 'info');
      return;
    }
    
    try {
      exportAsTxt(items);
      this.showToast('Export successful', 'success');
    } catch (error) {
      this.showToast('Export failed', 'error');
    }
  }

  private handleExportPdf(): void {
    const items = store.getItems();
    if (items.length === 0) {
      this.showToast('No saved items to export', 'info');
      return;
    }
    
    try {
      exportAsPdf(items);
      this.showToast('Export successful', 'success');
    } catch (error) {
      this.showToast('Export failed', 'error');
    }
  }

  public handleClearAll(): void {
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
    
    // Focus management
    const focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    firstElement?.focus();
    
    // Focus trap
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
    
    this.modal.removeEventListener('keydown', handleTabKey);
    this.modal.addEventListener('keydown', handleTabKey);
    
    // Close on escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    };
    
    this.modal.addEventListener('keydown', handleEscape);
  }

  private closeModal(): void {
    this.modal.hidden = true;
    document.body.style.overflow = '';
    this.currentModalItem = null;
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (!this.modal.hidden) {
        this.closeModal();
      }
      if (!this.comparisonModal.hidden) {
        this.closeComparisonModal();
      }
    }
  }

  private renderSavedItems(): void {
    const items = store.getItems();
    this.savedCount.textContent = `Saved (${items.length})`;
    
    if (items.length === 0) {
      this.savedItems.innerHTML = '<p>No saved items yet.</p>';
      return;
    }
    
    const itemsHtml = items.map(item => `
      <div class="saved-item">
        <h4>${this.escapeHtml(item.title)}</h4>
        ${item.url ? `<p><a href="${this.escapeHtml(item.url)}" target="_blank">${this.escapeHtml(item.url)}</a></p>` : ''}
        <p><small>Saved: ${new Date(item.createdAt).toLocaleDateString()}</small></p>
        <div class="item-actions">
          <button class="btn btn-danger btn-small" onclick="app.removeItem('${item.id}')">Remove</button>
        </div>
      </div>
    `).join('');
    
    this.savedItems.innerHTML = itemsHtml;
  }

  public removeItem(id: string): void {
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
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app
const app = new App();

// Make app globally available
(window as any).app = app;
