import { Joi } from '@docusaurus/utils-validation';

const optionsSchema = Joi.object({ domain: Joi.string().hostname() });

export default function pluginSimpleAnalytics(context, options) {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    name: 'docusaurus-plugin-simple-analytics',

    injectHtmlTags() {
      const domain = options?.domain;
      if (!isProd) {
        return {};
      }

      const scriptDomain = domain || 'scripts.simpleanalyticscdn.com';
      const noScriptDomain = domain || 'queue.simpleanalyticscdn.com';

      return {
        postBodyTags: [
          {
            tagName: 'script',
            attributes: {
              async: true,
              defer: true,
              src: `https://${scriptDomain}/latest.js`,
            },
          },
          {
            tagName: 'noscript',
            innerHTML: `<img src="https://${noScriptDomain}/noscript.gif" alt="" referrerpolicy="no-referrer-when-downgrade" />`,
          },
        ],
      };
    },
  };
}

export function validateOptions({
  options,
  validate,
}) {
  return validate(optionsSchema, options);
}
