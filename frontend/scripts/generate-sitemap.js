import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = process.env.VITE_SITE_URL || 'https://www.chameleon-agent.online';
const currentDate = new Date().toISOString().split('T')[0];

const routes = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/features', priority: '0.9', changefreq: 'weekly' },
  { url: '/download', priority: '0.95', changefreq: 'daily' },
  { url: '/help', priority: '0.8', changefreq: 'weekly' },
  { url: '/faq', priority: '0.8', changefreq: 'weekly' },
  { url: '/blog', priority: '0.85', changefreq: 'daily' },
  { url: '/blog/ultra-low-latency-webrtc-remote-desktop', priority: '0.75', changefreq: 'monthly' },
  { url: '/blog/teamviewer-vs-anydesk-vs-chameleon', priority: '0.8', changefreq: 'monthly' },
  { url: '/blog/how-to-setup-unattended-access-linux', priority: '0.75', changefreq: 'monthly' },
  { url: '/blog/zero-trust-end-to-end-encryption-remote-support', priority: '0.75', changefreq: 'monthly' },
  { url: '/security', priority: '0.85', changefreq: 'weekly' },
  { url: '/changelog', priority: '0.75', changefreq: 'weekly' },
  { url: '/contact', priority: '0.7', changefreq: 'monthly' },
  { url: '/privacy', priority: '0.5', changefreq: 'monthly' },
  { url: '/terms', priority: '0.5', changefreq: 'monthly' },
  { url: '/cookie-policy', priority: '0.4', changefreq: 'monthly' },
  { url: '/delete-account', priority: '0.4', changefreq: 'monthly' }
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${routes.map(r => `  <url>
    <loc>${DOMAIN}${r.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outputPath, xml, 'utf8');
console.log(`[SEO] Sitemap successfully generated at ${outputPath}`);
