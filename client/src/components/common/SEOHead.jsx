import { useEffect } from 'react';

export default function SEOHead({ 
    title = 'Chameleon - Ultra-Low Latency Secure Remote Desktop', 
    description = 'Connect to any PC remotely with zero configuration, end-to-end WebRTC encryption, 60 FPS performance, and seamless QR device pairing.',
    keywords = 'remote desktop, WebRTC remote access, unattended access, secure PC control, screen sharing, zero config remote desktop',
    canonical = 'https://chameleon-jet.vercel.app',
    ogImage = 'https://chameleon-jet.vercel.app/og-image.png',
    jsonLd = null 
}) {
    useEffect(() => {
        // Document Title
        document.title = title ? `${title} | Chameleon` : 'Chameleon Remote Desktop';

        // Update or create meta helper
        const setMeta = (nameAttr, attrVal, contentVal) => {
            let el = document.querySelector(`meta[${nameAttr}="${attrVal}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(nameAttr, attrVal);
                document.head.appendChild(el);
            }
            el.setAttribute('content', contentVal);
        };

        setMeta('name', 'description', description);
        setMeta('name', 'keywords', keywords);

        // OpenGraph
        setMeta('property', 'og:title', title);
        setMeta('property', 'og:description', description);
        setMeta('property', 'og:image', ogImage);
        setMeta('property', 'og:url', window.location.href);
        setMeta('property', 'og:type', 'website');
        setMeta('property', 'og:site_name', 'Chameleon Remote Desktop');

        // Twitter
        setMeta('name', 'twitter:card', 'summary_large_image');
        setMeta('name', 'twitter:title', title);
        setMeta('name', 'twitter:description', description);
        setMeta('name', 'twitter:image', ogImage);

        // Canonical
        let linkCanonical = document.querySelector('link[rel="canonical"]');
        if (!linkCanonical) {
            linkCanonical = document.createElement('link');
            linkCanonical.setAttribute('rel', 'canonical');
            document.head.appendChild(linkCanonical);
        }
        linkCanonical.setAttribute('href', canonical || window.location.href);

        // Inject JSON-LD
        let scriptJsonLd = document.getElementById('chameleon-jsonld');
        if (jsonLd) {
            if (!scriptJsonLd) {
                scriptJsonLd = document.createElement('script');
                scriptJsonLd.id = 'chameleon-jsonld';
                scriptJsonLd.type = 'application/ld+json';
                document.head.appendChild(scriptJsonLd);
            }
            scriptJsonLd.textContent = JSON.stringify(jsonLd);
        } else if (scriptJsonLd) {
            scriptJsonLd.remove();
        }

        window.scrollTo(0, 0);
    }, [title, description, keywords, canonical, ogImage, jsonLd]);

    return null;
}
