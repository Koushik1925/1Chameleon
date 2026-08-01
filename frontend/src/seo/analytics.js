import { VERIFICATION_IDS } from './seoConfig';

/**
 * Initialize Analytics and Webmaster Verification Head Meta Tags
 */
export function initAnalytics() {
  if (typeof window === 'undefined') return;

  // 1. Google Search Console Verification Meta Tag
  if (VERIFICATION_IDS.googleSearchConsole) {
    let gscMeta = document.querySelector('meta[name="google-site-verification"]');
    if (!gscMeta) {
      gscMeta = document.createElement('meta');
      gscMeta.setAttribute('name', 'google-site-verification');
      document.head.appendChild(gscMeta);
    }
    gscMeta.setAttribute('content', VERIFICATION_IDS.googleSearchConsole);
  }

  // 2. Bing Webmaster Verification Meta Tag
  if (VERIFICATION_IDS.bingWebmaster) {
    let bingMeta = document.querySelector('meta[name="msvalidate.01"]');
    if (!bingMeta) {
      bingMeta = document.createElement('meta');
      bingMeta.setAttribute('name', 'msvalidate.01');
      document.head.appendChild(bingMeta);
    }
    bingMeta.setAttribute('content', VERIFICATION_IDS.bingWebmaster);
  }

  // 3. Google Analytics 4 Script
  if (VERIFICATION_IDS.gaMeasurementId && !window.gtag) {
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${VERIFICATION_IDS.gaMeasurementId}`;
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', VERIFICATION_IDS.gaMeasurementId, {
      send_page_view: true
    });
  }

  // 4. Microsoft Clarity Script
  if (VERIFICATION_IDS.clarityId && !window.clarity) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', VERIFICATION_IDS.clarityId);
  }
}
