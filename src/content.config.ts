import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const autorixDocs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/autorix-docs" }),
  schema: z.object({
    title: z.string(),
    navTitle: z.string().optional(),
    description: z.string(),
    section: z.enum([
      "overview",
      "engines",
      "control-plane",
      "sdks",
      "operations",
      "reference",
    ]),
    order: z.number(),
    badge: z.string().optional(),
    ports: z.string().optional(),
    protocol: z.string().optional(),
  }),
});

export const collections = {
  autorixDocs,
};
