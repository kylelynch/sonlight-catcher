const config = require('./config');

/**
 * Fetches price data for a single product from Sonlight's JSON endpoint
 * @param {string} handle - The product handle (URL slug)
 * @returns {Promise<{price: string, compareAtPrice: string|null}>}
 */
async function fetchProductPrice(handle) {
  const url = `${config.baseProductUrl}/${handle}.json`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch ${handle}: ${response.status}`);
      return { price: null, compareAtPrice: null };
    }

    const data = await response.json();
    const product = data.product;

    if (!product || !product.variants || product.variants.length === 0) {
      return { price: null, compareAtPrice: null };
    }

    // Get the first variant's price (most products have single variant)
    const variant = product.variants[0];

    return {
      price: variant.price,
      compareAtPrice: variant.compare_at_price,
    };
  } catch (error) {
    console.error(`Error fetching ${handle}:`, error.message);
    return { price: null, compareAtPrice: null };
  }
}

/**
 * Fetches prices for multiple products with rate limiting
 * @param {Array<{handle: string, title: string, sku: string}>} items
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<Array>}
 */
async function fetchAllPrices(items, onProgress) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (onProgress) {
      onProgress(i + 1, items.length, item.title);
    }

    const priceData = await fetchProductPrice(item.handle);

    results.push({
      ...item,
      ...priceData,
    });

    // Rate limiting - wait between requests
    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, config.requestDelayMs));
    }
  }

  return results;
}

module.exports = {
  fetchProductPrice,
  fetchAllPrices,
};
