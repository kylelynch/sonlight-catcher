// Sonlight API Configuration
module.exports = {
  // Shopify Storefront API
  graphqlEndpoint: 'https://sonlight-books.myshopify.com/api/2023-10/graphql.json',
  storefrontAccessToken: 'b8e19fe1028dff73b2ff075cc934d603',

  // Sonlight product URLs
  baseProductUrl: 'https://www.sonlight.com/products',

  // Rate limiting (be nice to their servers)
  requestDelayMs: 200,
};
