# sql.js-httpvfs Playground

A web-based playground for querying SQLite databases over HTTP without downloading them fully. Built with Svelte 5, Tailwind CSS 4, and [sql.js-httpvfs](https://github.com/phiresky/sql.js-httpvfs).

**[Live Demo](https://nishad.github.io/sql.js-httpvfs-playground/)**

## Features

- Query remote SQLite databases directly in the browser
- No server required - works with any static file host
- SQL syntax highlighting with Prism.js
- Export results as JSON or CSV
- Configurable HTTP range request chunk sizes
- Dark mode support
- Responsive design

## How It Works

This playground uses [sql.js-httpvfs](https://github.com/phiresky/sql.js-httpvfs), which leverages HTTP Range requests to fetch only the parts of a SQLite database needed for a query. This means you can query a multi-gigabyte database without downloading the entire file.

The technique works by:
1. Loading SQLite compiled to WebAssembly (sql.js)
2. Intercepting SQLite's file read operations
3. Fetching only the required byte ranges via HTTP Range requests
4. Caching fetched pages for subsequent queries

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/nishad/sql.js-httpvfs-playground.git
cd sql.js-httpvfs-playground

# Install dependencies
yarn install

# Start development server
yarn dev
```

### Building for Production

```bash
yarn build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
yarn preview
```

## Using Your Own Database

1. Host your SQLite database on any static file server that supports HTTP Range requests (most do, including GitHub Pages, S3, Cloudflare R2, etc.)

2. Enter the database URL in the playground

3. Write your SQL query and click "Run Query"

### Database Preparation Tips

For best performance with large databases:

- Create indexes on columns you'll query frequently
- Consider using a page size that matches your typical query patterns (1024-4096 bytes is usually good)
- The database must be accessible via CORS if hosted on a different domain

### Avoiding Compression Issues

HTTP Range requests require uncompressed responses. Some hosting providers (like GitHub Pages) may gzip certain file types, which breaks Range requests.

**Solutions:**
- Use `.sqlite3` extension instead of `.db` (GitHub Pages won't compress it)
- Use a hosting provider that allows disabling compression (S3, R2, etc.)
- Add appropriate `Content-Encoding` headers if you control the server

## Tech Stack

- **Framework**: [Svelte 5](https://svelte.dev/) with runes
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [Flowbite Svelte](https://flowbite-svelte.com/)
- **Database**: [sql.js-httpvfs](https://github.com/phiresky/sql.js-httpvfs)
- **Code Editor**: [CodeJar](https://medv.io/codejar/) + [Prism.js](https://prismjs.com/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Icons**: [Lucide](https://lucide.dev/)

## Project Structure

```
sql.js-httpvfs-playground/
├── public/
│   └── db/                 # Sample SQLite database
├── src/
│   ├── App.svelte          # Main application component
│   ├── app.postcss         # Global styles
│   └── main.js             # Application entry point
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── svelte.config.js        # Svelte configuration
├── postcss.config.js       # PostCSS configuration
└── package.json
```

## Deployment

This project is configured for automatic deployment to GitHub Pages via GitHub Actions. Every push to the `main` branch triggers a build and deployment.

To deploy to your own GitHub Pages:

1. Fork this repository
2. Enable GitHub Pages in repository settings (Settings > Pages > Source: GitHub Actions)
3. Push to the `main` branch

## License

[MIT](LICENSE)

## Acknowledgments

- [phiresky](https://github.com/phiresky) for creating sql.js-httpvfs
- [sql.js](https://github.com/sql-js/sql.js) team for the SQLite WebAssembly port

## Related Projects

- [sql.js-httpvfs](https://github.com/phiresky/sql.js-httpvfs) - The core library powering this playground
- [sql.js](https://github.com/sql-js/sql.js) - SQLite compiled to WebAssembly
