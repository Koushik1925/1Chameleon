import React, { useEffect } from 'react';
import { SITE_CONFIG } from './seoConfig';

/**
 * Reusable SEO Manager Component
 * Dynamically injects title, meta tags, canonical link, Open Graph, Twitter Cards,
 * meta robots directives, and JSON-LD schemas into document.head.
 */
export default function SEOManager({
  title,
  description,
  keywords,
  canonicalPath = '',
  ogImage = SITE_CONFIG.defaultOgImage,
  ogType = 'website',
  noIndex = false,
  schemas = []
}) {
  const fullTitle = title 
    ? (title.includes(SITE_CONFIG.name) ? title : `${title} | ${SITE_CONFIG.name}`) 
    : SITE_CONFIG.defaultTitle;
    
  const metaDescription = description || SITE_CONFIG.defaultDescription;
  const canonicalUrl = `${SITE_CONFIG.domain}${canonicalPath}`;
  const safeOgImage = ogImage || SITE_CONFIG.defaultOgImage;
  const imageUrl = safeOgImage.startsWith('http') ? safeOgImage : `${SITE_CONFIG.domain}${safeOgImage}`;

  const schemasKey = JSON.stringify(schemas || []);
  const keywordsKey = Array.isArray(keywords) ? keywords.join(',') : (keywords || '');

  useEffect(() => {
    // Update Title
    document.title = fullTitle;

    // Helper to set or update meta tag
    const setMetaTag = (selector, nameAttr, nameValue, contentValue) => {
      if (!contentValue) return;
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, nameValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentValue);
    };

    // Helper to set link canonical
    const setLinkCanonical = (url) => {
      let element = document.querySelector('link[rel="canonical"]');
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', 'canonical');
        document.head.appendChild(element);
      }
      element.setAttribute('href', url);
    };

    // Standard Meta Tags
    setMetaTag('meta[name="description"]', 'name', 'description', metaDescription);
    if (keywordsKey) {
      setMetaTag('meta[name="keywords"]', 'name', 'keywords', keywordsKey);
    }
    setMetaTag('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, follow' : 'index, follow');
    setMetaTag('meta[name="theme-color"]', 'name', 'theme-color', SITE_CONFIG.themeColor);
    setMetaTag('meta[name="apple-mobile-web-app-capable"]', 'name', 'apple-mobile-web-app-capable', 'yes');
    setMetaTag('meta[name="apple-mobile-web-app-status-bar-style"]', 'name', 'apple-mobile-web-app-status-bar-style', 'black-translucent');

    // Open Graph Tags
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', metaDescription);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_CONFIG.name);
    setMetaTag('meta[property="og:locale"]', 'property', 'og:locale', SITE_CONFIG.locale);

    // Twitter Card Tags
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:site"]', 'name', 'twitter:site', SITE_CONFIG.twitterHandle);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', metaDescription);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    // Set Canonical URL
    setLinkCanonical(canonicalUrl);

    // Inject JSON-LD Schemas
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"][data-seo="true"]');
    existingScripts.forEach(script => script.remove());

    const activeSchemas = (schemas || []).filter(Boolean);

    activeSchemas.forEach((schemaObj, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'true');
      script.setAttribute('id', `jsonld-schema-${index}`);
      script.textContent = JSON.stringify(schemaObj);
      document.head.appendChild(script);
    });

    return () => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"][data-seo="true"]');
      scripts.forEach(script => script.remove());
    };
  }, [fullTitle, metaDescription, canonicalUrl, imageUrl, ogType, noIndex, keywordsKey, schemasKey]);

  return null;
}
