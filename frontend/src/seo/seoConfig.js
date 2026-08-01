/**
 * Chameleon SEO Master Configuration
 * Contains global defaults, metadata configurations, keyword strategy, and site constants.
 */

export const SITE_CONFIG = {
  name: 'Chameleon',
  legalName: 'Chameleon Remote Systems Inc.',
  domain: import.meta.env.VITE_SITE_URL || 'https://www.chameleon-agent.online',
  titleTemplate: '%s | Chameleon Remote Desktop Software',
  defaultTitle: 'Chameleon — Secure Ultra-Low Latency Remote Desktop Software',
  defaultDescription: 'Fast, secure cross-platform remote desktop software. Low latency WebRTC screen sharing, remote PC control, file transfer, and unattended access for Windows, Mac, Linux, Android, and iOS.',
  themeColor: '#06b6d4',
  locale: 'en_US',
  twitterHandle: '@ChameleonRemote',
  githubUrl: 'https://github.com/Rithvik-krishna/Chameleon',
  supportEmail: 'support@chameleon-agent.online',
  securityEmail: 'security@chameleon-agent.online',
  defaultOgImage: '/og-image.png',
};

export const KEYWORDS = {
  primary: [
    'remote desktop software',
    'remote desktop',
    'remote access',
    'remote PC',
    'remote computer',
    'screen sharing',
    'remote support'
  ],
  secondary: [
    'cross platform remote desktop',
    'secure remote desktop',
    'remote desktop for windows',
    'remote desktop for mac',
    'remote desktop for linux',
    'remote desktop for android',
    'remote desktop for iphone',
    'file transfer software',
    'unattended remote access'
  ],
  longTail: [
    'best TeamViewer alternative',
    'best AnyDesk alternative',
    'control computer from phone',
    'access office computer remotely',
    'remote desktop over internet',
    'secure remote desktop software'
  ]
};

export const VERIFICATION_IDS = {
  googleSearchConsole: import.meta.env.VITE_GSC_VERIFICATION || '',
  bingWebmaster: import.meta.env.VITE_BING_VERIFICATION || '',
  gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
  clarityId: import.meta.env.VITE_CLARITY_ID || ''
};
