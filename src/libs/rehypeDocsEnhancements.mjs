/**
 * Rehype plugin that enhances rendered Markdown for Autorix documentation:
 * 1. Wraps tables in keyboard-accessible scrollable regions with explicit <th scope>.
 * 2. Wraps Shiki <pre> blocks in a dark-themed code container with language badge and copy button.
 * 3. Appends permalink anchor links to h2 and h3 headings that have an id.
 */
function walk(node, visitor) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node.children)) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const replacement = visitor(child, node, i);
      if (replacement) {
        node.children[i] = replacement;
      } else {
        walk(child, visitor);
      }
    }
  }
}

function addTableScopes(tableNode) {
  walk(tableNode, (child, parent) => {
    if (child.type === "element" && child.tagName === "thead") {
      walk(child, (th) => {
        if (th.type === "element" && th.tagName === "th") {
          th.properties = th.properties || {};
          if (!th.properties.scope) {
            th.properties.scope = "col";
          }
        }
      });
    } else if (child.type === "element" && child.tagName === "tbody") {
      walk(child, (th) => {
        if (th.type === "element" && th.tagName === "th") {
          th.properties = th.properties || {};
          if (!th.properties.scope) {
            th.properties.scope = "row";
          }
        }
      });
    }
    return null;
  });
}

function normalizeLanguage(rawLang) {
  if (!rawLang || typeof rawLang !== "string") return "text";
  const lang = rawLang.trim().toLowerCase();
  const labels = {
    sh: "bash",
    shell: "bash",
    bash: "bash",
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    go: "go",
    py: "python",
    python: "python",
    yml: "yaml",
    yaml: "yaml",
    json: "json",
    sql: "sql",
    hcl: "hcl",
    proto: "protobuf",
    text: "text",
    plaintext: "text",
  };
  return labels[lang] || lang;
}

export default function rehypeDocsEnhancements() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== "element") return null;

      // 1. Wrap tables in keyboard-scrollable region and add scope attributes
      if (node.tagName === "table") {
        addTableScopes(node);
        return {
          type: "element",
          tagName: "div",
          properties: {
            className: ["docs-table-wrapper"],
            tabIndex: 0,
            role: "region",
            ariaLabel: "Data table",
          },
          children: [node],
        };
      }

      // 2. Wrap code blocks (<pre>) with language header + copy button
      if (node.tagName === "pre") {
        const props = node.properties || {};
        const rawLang =
          props.dataLanguage ||
          props["data-language"] ||
          (Array.isArray(props.className)
            ? props.className
                .find((c) => typeof c === "string" && c.startsWith("language-"))
                ?.replace("language-", "")
            : undefined);
        const langLabel = normalizeLanguage(rawLang);

        return {
          type: "element",
          tagName: "div",
          properties: {
            className: ["docs-code-block"],
            "data-code-block": "",
          },
          children: [
            {
              type: "element",
              tagName: "div",
              properties: {
                className: ["docs-code-header"],
              },
              children: [
                {
                  type: "element",
                  tagName: "span",
                  properties: {
                    className: ["docs-code-lang"],
                  },
                  children: [{ type: "text", value: langLabel }],
                },
                {
                  type: "element",
                  tagName: "button",
                  properties: {
                    type: "button",
                    className: ["docs-copy-btn"],
                    "data-copy-code": "",
                  },
                  children: [{ type: "text", value: "Copy" }],
                },
              ],
            },
            node,
          ],
        };
      }

      // 3. Append permalink anchor to h2/h3 headings with an id
      if (
        (node.tagName === "h2" || node.tagName === "h3") &&
        node.properties &&
        typeof node.properties.id === "string" &&
        node.properties.id.length > 0
      ) {
        const id = node.properties.id;
        node.children = node.children || [];
        const hasAnchor = node.children.some(
          (c) =>
            c.type === "element" &&
            c.tagName === "a" &&
            Array.isArray(c.properties?.className) &&
            c.properties.className.includes("docs-heading-anchor")
        );
        if (!hasAnchor) {
          node.children.push({
            type: "element",
            tagName: "a",
            properties: {
              href: `#${id}`,
              className: ["docs-heading-anchor"],
              ariaLabel: `Link to section ${id.replace(/-/g, " ")}`,
            },
            children: [{ type: "text", value: "#" }],
          });
        }
      }

      return null;
    });
  };
}
