const config = require('./config');

/**
 * Parses the GraphQL response and extracts item data
 * @param {object} graphqlResponse - The raw GraphQL response
 * @returns {Array<object>} Parsed items
 */
function parseGraphQLResponse(graphqlResponse) {
  const nodes = graphqlResponse?.data?.nodes || [];

  return nodes.map((node) => {
    const variantId = node.id?.replace('gid://shopify/ProductVariant/', '') || null;

    return {
      variantId,
      sku: node.sku,
      variantTitle: node.title,
      title: node.product?.title,
      handle: node.product?.handle,
      productType: node.product?.productType,
      group: node.product?.groupMetafield?.value || 'Other',
      description: node.product?.descriptionMetafield?.value || '',
      imageUrl: node.image?.url || null,
      productUrl: node.product?.handle
        ? `${config.baseProductUrl}/${node.product.handle}?variant=${variantId}`
        : null,
    };
  });
}

/**
 * Groups items by their category
 * @param {Array<object>} items
 * @returns {object} Items grouped by category
 */
function groupByCategory(items) {
  return items.reduce((acc, item) => {
    const group = item.group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
}

/**
 * Filters items to only include books (excludes instructor guides, resources, etc.)
 * @param {Array<object>} items
 * @returns {Array<object>} Only book items
 */
function filterBooksOnly(items) {
  const bookTypes = ['READER', 'READ ALOUD', 'HISTORY', 'BIBLE'];
  const bookGroups = ['Readers', 'Read-Alouds', 'History', 'Bible'];

  return items.filter(
    (item) => bookTypes.includes(item.productType) || bookGroups.includes(item.group)
  );
}

module.exports = {
  parseGraphQLResponse,
  groupByCategory,
  filterBooksOnly,
};
