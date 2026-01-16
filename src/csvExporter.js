const fs = require('fs');
const path = require('path');

/**
 * Escapes a value for CSV (handles commas, quotes, newlines)
 * @param {string} value
 * @returns {string}
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Exports items to CSV format
 * @param {Array<object>} items - Items with price data
 * @param {string} outputPath - Path to save CSV
 * @param {object} options - Export options
 */
function exportToCSV(items, outputPath, options = {}) {
  const { includeDescription = false, booksOnly = false } = options;

  // Define columns
  const columns = [
    { key: 'sku', header: 'SKU' },
    { key: 'title', header: 'Title' },
    { key: 'group', header: 'Category' },
    { key: 'price', header: 'Sonlight Price' },
    { key: 'productUrl', header: 'Sonlight URL' },
    { key: 'handle', header: 'Handle (for HPB search)' },
  ];

  if (includeDescription) {
    columns.push({ key: 'description', header: 'Description' });
  }

  // Build CSV content
  const headerRow = columns.map((c) => c.header).join(',');

  const dataRows = items.map((item) => {
    return columns
      .map((col) => {
        let value = item[col.key];

        // Format price
        if (col.key === 'price' && value) {
          value = `$${parseFloat(value).toFixed(2)}`;
        }

        return escapeCSV(value);
      })
      .join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\n');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(outputPath, csvContent, 'utf8');

  return {
    rowCount: items.length,
    path: outputPath,
  };
}

/**
 * Generates a summary report
 * @param {Array<object>} items
 * @returns {object} Summary statistics
 */
function generateSummary(items) {
  const totalItems = items.length;
  const itemsWithPrices = items.filter((i) => i.price).length;
  const totalValue = items.reduce((sum, item) => {
    return sum + (parseFloat(item.price) || 0);
  }, 0);

  const byCategory = {};
  items.forEach((item) => {
    if (!byCategory[item.group]) {
      byCategory[item.group] = { count: 0, value: 0 };
    }
    byCategory[item.group].count++;
    byCategory[item.group].value += parseFloat(item.price) || 0;
  });

  return {
    totalItems,
    itemsWithPrices,
    totalValue: totalValue.toFixed(2),
    byCategory,
  };
}

module.exports = {
  exportToCSV,
  generateSummary,
};
