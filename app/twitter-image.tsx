export { default, alt, size, contentType, runtime } from "./opengraph-image";

/**
 * Next.js convention: app/twitter-image.tsx generates the image used
 * specifically for Twitter/X card previews. Re-exporting the same
 * generator from opengraph-image.tsx avoids duplicating the entire
 * ImageResponse JSX — both platforms get an identical, on-brand preview.
 */
