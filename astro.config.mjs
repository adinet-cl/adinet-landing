// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import icon from "astro-icon";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://adinet.app",

  redirects: {
    "/": "/en-us/",
  },

  vite: {
    plugins: [tailwindcss()],
  },

  i18n: {
    defaultLocale: "en-us",
    locales: ["en-us", "es-mx", "es-es"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false
    },
  },

  integrations: [icon(), sitemap()],
});
