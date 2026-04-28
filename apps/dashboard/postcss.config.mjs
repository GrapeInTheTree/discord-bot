// Tailwind v4 ships its own PostCSS plugin; that's the entire pipeline.
// Older Tailwind v3 setups also needed autoprefixer — v4 handles vendor
// prefixes internally.
const config = {
  plugins: ['@tailwindcss/postcss'],
};

export default config;
