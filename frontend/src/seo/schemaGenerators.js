/**
 * JSON-LD Schema Generators for Google Rich Snippets
 */

import { SITE_CONFIG } from './seoConfig';

/**
 * Organization Schema
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_CONFIG.domain}/#organization`,
    name: SITE_CONFIG.name,
    legalName: SITE_CONFIG.legalName,
    url: SITE_CONFIG.domain,
    logo: `${SITE_CONFIG.domain}/favicon.svg`,
    sameAs: [
      SITE_CONFIG.githubUrl,
      'https://twitter.com/ChameleonRemote'
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: SITE_CONFIG.supportEmail,
        contactType: 'technical support',
        availableLanguage: ['English']
      },
      {
        '@type': 'ContactPoint',
        email: SITE_CONFIG.securityEmail,
        contactType: 'security inquiries',
        availableLanguage: ['English']
      }
    ]
  };
}

/**
 * WebSite & SearchAction Schema
 */
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_CONFIG.domain}/#website`,
    url: SITE_CONFIG.domain,
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.defaultDescription,
    publisher: {
      '@id': `${SITE_CONFIG.domain}/#organization`
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_CONFIG.domain}/faq?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * SoftwareApplication Schema
 */
export function getSoftwareApplicationSchema({
  version = '1.4.1',
  operatingSystem = 'Windows, macOS, Linux, Android, iOS',
  downloadUrl = `${SITE_CONFIG.domain}/download`,
  fileSize = '64.2 MB',
  price = '0',
  priceCurrency = 'USD'
} = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_CONFIG.domain}/#softwareapplication`,
    name: 'Chameleon Remote Desktop',
    operatingSystem,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Remote Desktop & Access Software',
    softwareVersion: version,
    fileSize,
    downloadUrl,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency,
      availability: 'https://schema.org/InStock'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '1240',
      bestRating: '5',
      worstRating: '1'
    },
    author: {
      '@id': `${SITE_CONFIG.domain}/#organization`
    },
    description: 'Ultra-low latency, peer-to-peer remote desktop application featuring hardware accelerated H.264 video streaming, end-to-end encryption, and multi-platform remote control.'
  };
}

/**
 * FAQPage Schema
 * @param {Array<{question: string, answer: string}>} faqs
 */
export function getFAQPageSchema(faqs = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

/**
 * BreadcrumbList Schema
 * @param {Array<{name: string, item: string}>} items
 */
export function getBreadcrumbSchema(items = []) {
  const itemListElement = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: SITE_CONFIG.domain
    },
    ...items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 2,
      name: it.name,
      item: it.item.startsWith('http') ? it.item : `${SITE_CONFIG.domain}${it.item}`
    }))
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement
  };
}

/**
 * BlogPosting Schema
 */
export function getBlogPostingSchema({
  title,
  description,
  url,
  datePublished,
  dateModified,
  authorName = 'Chameleon Engineering Team',
  imageUrl = `${SITE_CONFIG.domain}/og-image.png`
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    headline: title,
    description: description,
    image: [imageUrl],
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Organization',
      name: authorName,
      url: SITE_CONFIG.domain
    },
    publisher: {
      '@id': `${SITE_CONFIG.domain}/#organization`
    }
  };
}

/**
 * ContactPage Schema
 */
export function getContactPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Chameleon Support & Sales',
    description: 'Get in touch with the Chameleon Remote Desktop support team for assistance, custom enterprise licensing, or security inquiries.',
    url: `${SITE_CONFIG.domain}/contact`,
    mainEntity: {
      '@id': `${SITE_CONFIG.domain}/#organization`
    }
  };
}

/**
 * General WebPage Schema
 */
export function getWebPageSchema({ title, description, path }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_CONFIG.domain}${path}#webpage`,
    url: `${SITE_CONFIG.domain}${path}`,
    name: title,
    description: description,
    isPartOf: {
      '@id': `${SITE_CONFIG.domain}/#website`
    }
  };
}
