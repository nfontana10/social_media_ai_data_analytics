# Social Media Analytics Tools Cheat Sheet

An interactive website that wraps your existing cheatsheet with save functionality, search, and export capabilities. Built with Vite, TypeScript, and serverless backend for data persistence.

## Features

- **Interactive Cheatsheet**: Your existing HTML content wrapped in a modern UI
- **Save & Sync**: Save recommendations with automatic backend synchronization
- **Search**: Real-time search with highlighting
- **Export**: Download saved items as TXT or PDF
- **Responsive**: Mobile-friendly design with collapsible sidebar
- **Accessible**: Keyboard navigation, focus management, and screen reader support
- **Offline Support**: Works offline with local storage, syncs when online

## Quick Start

### Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Environment Variables

### Storage Configuration

Set `STORE_PROVIDER` to choose your storage backend:

- `memory` (default) - In-memory storage (dev only)
- `kv` - Vercel KV (Upstash Redis)
- `blob` - Vercel Blob storage
- `blobs` - Netlify Blobs

### Vercel KV Setup

If using `STORE_PROVIDER=kv`:

```bash
# Required environment variables
KV_URL=https://your-namespace.upstash.io
KV_TOKEN=your-kv-token
```

### Vercel Blob Setup

If using `STORE_PROVIDER=blob`:

```bash
# Required environment variables
BLOB_READ_WRITE_TOKEN=your-blob-token
```

### Netlify Blobs Setup

If using `STORE_PROVIDER=blobs`:

```bash
# Required environment variables
NETLIFY_BLOBS_TOKEN=your-blobs-token
```

## Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Configure environment variables** in Vercel dashboard:
   - `STORE_PROVIDER`
   - Storage-specific tokens (see above)

4. **Set up storage** (if not using memory):
   - **KV**: Create Upstash Redis database and add credentials
   - **Blob**: Create Vercel Blob store and add token

### Netlify

1. **Install Netlify CLI**:
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

3. **Configure environment variables** in Netlify dashboard

4. **Set up Netlify Blobs** (if using `STORE_PROVIDER=blobs`):
   ```bash
   netlify blobs:create recommendations
   ```

### GitHub Pages (Frontend Only)

For static hosting without backend sync:

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy `dist/` folder** to GitHub Pages

3. **Set `STORE_PROVIDER=memory`** for local-only storage

## Project Structure

```
.
├── index.html                 # Main HTML file
├── cheatsheet.html           # Your existing cheatsheet
├── src/
│   ├── main.ts              # Application entry point
│   ├── types.ts             # TypeScript type definitions
│   ├── styles.css           # Global styles
│   ├── state/
│   │   └── store.ts         # State management & sync
│   └── services/
│       ├── api.ts           # Backend API client
│       ├── generator.ts     # Mock info generator
│       └── exporter.ts      # TXT/PDF export
├── api/
│   └── recs.ts              # Vercel serverless function
├── netlify/
│   └── functions/
│       └── recs.ts          # Netlify serverless function
└── package.json
```

## API Endpoints

### GET /api/recs?userId={userId}

Retrieves saved recommendations for a user.

**Response**:
```json
{
  "userId": "uuid",
  "items": [
    {
      "id": "uuid",
      "title": "Tool Name",
      "url": "https://example.com",
      "snippet": "Description",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/recs

Saves recommendations for a user.

**Request Body**:
```json
{
  "userId": "uuid",
  "items": [...],
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Privacy & Data

- **Anonymous Users**: Each user gets a random UUID stored in localStorage
- **No Personal Data**: Only tool recommendations are stored
- **Data Retention**: Storage providers may have their own retention policies
- **Local Storage**: Data persists in browser until cleared

## Migration Between Providers

To migrate between storage providers:

1. **Export data** from current provider
2. **Update environment variables** for new provider
3. **Redeploy** the application
4. **Data will sync** automatically on first load

## Development Notes

### Adding New Tools

1. **Update `cheatsheet.html`** with new table rows
2. **Action buttons** are automatically added to each row
3. **Search** will include new content automatically

### Customizing Styles

- **Global styles**: Edit `src/styles.css`
- **Component-specific**: Add classes to HTML elements
- **Responsive design**: Mobile-first approach with breakpoints

### Extending Functionality

- **New export formats**: Add to `src/services/exporter.ts`
- **Additional storage**: Implement new adapter in API files
- **UI components**: Extend the main App class in `src/main.ts`

## Troubleshooting

### Common Issues

1. **Build fails**: Check TypeScript errors in `src/` files
2. **API errors**: Verify environment variables and storage setup
3. **CORS issues**: Ensure API endpoints are properly configured
4. **Storage not working**: Check provider credentials and permissions

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=true
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review deployment provider documentation
- Open an issue on GitHub
