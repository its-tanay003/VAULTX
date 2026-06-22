/**
 * Visually hidden until focused. First tab stop on any page lets
 * keyboard users jump straight past the sidebar/header to main content.
 * Add <SkipToContent /> as the very first child of the dashboard layout's
 * returned JSX, and add id="main-content" to the <main> element.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-3 focus:left-3 focus:z-[200]
        focus:bg-vault-teal focus:text-vault-bg
        focus:px-4 focus:py-2 focus:rounded-lg
        focus:text-sm focus:font-medium
        focus:outline-none focus:ring-2 focus:ring-vault-teal focus:ring-offset-2 focus:ring-offset-vault-bg
      "
    >
      Skip to main content
    </a>
  );
}
