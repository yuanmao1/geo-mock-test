// Export interfaces that were likely defined in App.tsx or needed by components
// If App.tsx imports them from @geo/shared-types, we can just import them where needed.

// We typically would move pages to src/pages, but I will keep them where they are referenced or imports will break.
// HomePage and ProductDetailPage seems to be internal to App.tsx in the original file (defined inside it?).
// I need to read App.tsx fully to see if HomePage/ProductDetailPage are exported or defined inline.
