import "server-only";

export const MAX_SVG_BYTES = 1024 * 1024;

export class InvalidSvgError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSvgError";
  }
}

/**
 * Strips scripts, event handlers and anything else outside the SVG allowlist.
 * SVGs can run code when opened directly, and sponsors can upload through
 * public edit links, so every stored SVG must pass through here.
 * Throws InvalidSvgError if the result isn't a well-formed SVG.
 *
 * jsdom is heavy, so it's only loaded when an SVG is actually uploaded.
 */
export async function sanitizeSvg(svg: string): Promise<string> {
  const [{ JSDOM }, { default: createDOMPurify }] = await Promise.all([
    import("jsdom"),
    import("dompurify"),
  ]);

  const { window } = new JSDOM("");
  try {
    const purify = createDOMPurify(window);
    // Design tools often export <use>, which DOMPurify drops by default. It's
    // only safe when it points inside this file, so other targets are removed.
    purify.addHook("afterSanitizeAttributes", (node) => {
      if (node.nodeName.toLowerCase() !== "use") return;
      for (const attr of ["href", "xlink:href"]) {
        if (!node.getAttribute(attr)?.startsWith("#")) node.removeAttribute(attr);
      }
    });
    const clean = purify
      .sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ["use"],
      })
      .trim();
    // An empty <svg> means nothing drawable survived, e.g. a truncated file.
    if (!/^<svg[\s>]/i.test(clean) || /^<svg[^>]*>\s*<\/svg>$/i.test(clean)) {
      throw new InvalidSvgError("File is not a valid SVG");
    }
    try {
      // Browsers parse SVG files as strict XML, so a malformed file wouldn't render.
      new JSDOM(clean, { contentType: "image/svg+xml" }).window.close();
    } catch {
      throw new InvalidSvgError("File is not a valid SVG");
    }
    return clean;
  } finally {
    window.close();
  }
}
