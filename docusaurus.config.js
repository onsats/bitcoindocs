// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const {themes} = require('prism-react-renderer');
const lightTheme = themes.github;
const darkTheme = themes.dracula;

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'BitcoinDocs',
  tagline: 'Bitcoin Documentation for Devs',
  favicon: 'img/bitcoin-dev-min.webp',

  staticDirectories: ["static", "assets"],

  // Set the production url of your site here
  url: 'https://bitcoindocs.org',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'onsats', // Usually your GitHub org/user name.
  projectName: 'bitcoindocs', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    'docusaurus-plugin-sass',
    ['./extensions/sa', {
      domain: 'sa.bitcoindocs.org'
    }],
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/onsats/bitcoindocs/tree/master/',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],

        },
        blog: {
          blogTitle: 'Notes',
          blogDescription: 'A Docusaurus powered blog!',
          postsPerPage: 'ALL',
          routeBasePath: '/notes',
          blogSidebarCount: 0,
          blogSidebarTitle: undefined, // Set to undefined to remove the title
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],

        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
      type: 'text/css',
      integrity:
        'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
      crossorigin: 'anonymous',
    },
  ],
  
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image:  'img/bitcoin-dev-min.webp',
      navbar: {
        title: 'BitcoinDocs',
        logo: {
          alt: 'BitcoinDocs',
          src: 'img/bitcoin-dev-min.webp',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docs',
            position: 'left',
            label: 'Docs',
          },
          {
            to: 'notes', 
            label: 'Notes',
            position: 'left',
          }, // or position: 'right'
          {
            href: 'https://github.com/onsats/bitcoindocs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Basics',
                to: '/docs/basics',
              },
              {
                label: 'SDKs',
                to: '/docs/SDKs',
              },
              {
                label: 'Scripts',
                to: '/docs/bitcoin-scripts',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Delving Bitcoin',
                href: 'https://delvingbitcoin.org/',
              },
              {
                label: 'Stack Overflow',
                href: 'https://bitcoin.stackexchange.com/',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Notes',
                href: '/notes',
              },
              {
                label: 'Contribute to BitcoinDocs',
                href: 'https://github.com/onsats/bitcoindocs',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} BitcoinDocs under CC BY-SA 4.0. Built with Docusaurus.`,
      },
      prism: {
        theme: lightTheme,
        darkTheme: darkTheme,
      },
      colorMode: {
        defaultMode: "dark",
        disableSwitch: false,
        respectPrefersColorScheme: false}
    }),
};

module.exports = config;
