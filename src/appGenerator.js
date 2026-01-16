const fs = require('fs');
const path = require('path');

/**
 * Generates the comparison app HTML with book data injected
 * @param {Array<object>} items - Items with price data
 * @param {string} outputPath - Path to save HTML
 * @param {object} options - Generator options
 */
function generateApp(items, outputPath, options = {}) {
  const { curriculumName = 'Sonlight Curriculum' } = options;

  // Read the template
  const templatePath = path.join(__dirname, '..', 'app.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Prepare book data for injection
  const bookData = items.map(item => ({
    sku: item.sku,
    title: item.title,
    group: item.group,
    price: parseFloat(item.price) || 0,
    imageUrl: item.imageUrl,
    productUrl: item.productUrl,
    handle: item.handle,
  }));

  // Inject the data
  html = html.replace(
    'const bookData = BOOK_DATA_PLACEHOLDER;',
    `const bookData = ${JSON.stringify(bookData, null, 2)};`
  );

  // Update curriculum name in header
  html = html.replace(
    'Intro to World History, Year 2 of 2 (Curriculum C)',
    curriculumName
  );

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(outputPath, html, 'utf8');

  return {
    itemCount: items.length,
    path: outputPath,
  };
}

module.exports = {
  generateApp,
};
