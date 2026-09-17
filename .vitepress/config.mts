import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Dwesk PABX API',
  description: 'Outbound calling, queue upload, content management and webhooks for the Dwesk PABX platform.',
  base: '/dxesk-pabx-api-docs/',
  cleanUrls: true,
  srcExclude: ['README.md'],
  lastUpdated: true,

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
      },
    ],
    ['link', { rel: 'icon', href: '/dxesk-pabx-api-docs/favicon.ico' }],
  ],

  themeConfig: {
    logo: { src: '/logo_side.png', alt: 'Dwesk' },
    siteTitle: 'API Documentation',

    nav: [
      { text: 'Guides', link: '/guide/' },
      { text: 'API Reference', link: '/api/outbound-call' },
      { text: 'Webhooks', link: '/webhooks/' },
      { text: 'Reference', link: '/reference/errors' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/guide/' },
          { text: 'Quickstart', link: '/guide/quickstart' },
          { text: 'Authentication', link: '/guide/authentication' },
          { text: 'Base URLs', link: '/guide/environments' },
          { text: 'TypeScript Setup', link: '/guide/typescript' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Outbound Call', link: '/api/outbound-call' },
          { text: 'Queue Number Upload', link: '/api/queue-upload' },
          { text: 'Content Upload', link: '/api/content-upload' },
          { text: 'Direct Agent Mapping', link: '/api/direct-mapping' },
          { text: 'Recording Export', link: '/api/recordings' },
        ],
      },
      {
        text: 'Webhooks',
        items: [
          { text: 'Overview', link: '/webhooks/' },
          { text: 'Incoming Call', link: '/webhooks/incoming-call' },
          { text: 'Pre-Connect', link: '/webhooks/pre-connect' },
          { text: 'Queue Call End', link: '/webhooks/queue-call-end' },
          { text: 'Outbound Call End', link: '/webhooks/outbound-call-end' },
          { text: 'Connect Agent Call End', link: '/webhooks/connect-agent-call-end' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Error Codes', link: '/reference/errors' },
          { text: 'Cause Codes', link: '/reference/cause-codes' },
          { text: 'Audio Requirements', link: '/reference/audio' },
          { text: 'Types', link: '/reference/types' },
        ],
      },
    ],

    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: true, next: true },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/dxesk/dxesk-pabx-api-docs' }],
    footer: {
      message: 'Dwesk PABX API Documentation',
      copyright: 'Axon Group International (Pvt) Ltd',
    },
  },
})
