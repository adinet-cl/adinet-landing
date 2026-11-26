// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import icon from "astro-icon";
import sitemap from "@astrojs/sitemap";
import rehypeDocsEnhancements from "./src/libs/rehypeDocsEnhancements.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://adinet.app",

  redirects: {
    "/": "/en-us/",
  },

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    shikiConfig: {
      theme: "github-dark-default",
      wrap: false,
      langAlias: {
        indigo: "prisma",
      },
    },
    rehypePlugins: [rehypeDocsEnhancements],
  },

  i18n: {
    defaultLocale: "en-us",
    locales: ["en-us", "es-mx", "es-es"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },

  integrations: [icon(), sitemap()],
});
