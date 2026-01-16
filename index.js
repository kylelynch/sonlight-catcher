#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parseGraphQLResponse, filterBooksOnly } = require('./src/dataParser');
const { fetchAllPrices } = require('./src/priceFetcher');
const { exportToCSV, generateSummary } = require('./src/csvExporter');
const { exportToXLSX } = require('./src/xlsxExporter');
const { generateApp } = require('./src/appGenerator');

/**
 * Main CLI application
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const inputFile = args.find((a) => !a.startsWith('--')) || 'graphresponse.json';
  const booksOnly = args.includes('--books-only');
  const skipPrices = args.includes('--skip-prices');
  const useCSV = args.includes('--csv');
  const useApp = args.includes('--app');

  // Determine output format and default path
  let defaultOutput;
  if (useApp) {
    defaultOutput = 'output/comparison-app.html';
  } else if (useCSV) {
    defaultOutput = 'output/curriculum-books.csv';
  } else {
    defaultOutput = 'output/curriculum-books.xlsx';
  }
  const outputFile = args.find((a) => a.startsWith('--output='))?.split('=')[1] || defaultOutput;

  console.log('\n📚 Sonlight Curriculum Book Catcher\n');
  console.log('='.repeat(50));

  // Load GraphQL response
  console.log(`\n📂 Loading data from: ${inputFile}`);

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Error: File not found: ${inputFile}`);
    console.log('\nUsage: node index.js [input.json] [options]');
    console.log('\nOptions:');
    console.log('  --app            Generate interactive HTML comparison app (recommended)');
    console.log('  --csv            Export as CSV');
    console.log('  --books-only     Only include books (exclude supplies, guides)');
    console.log('  --skip-prices    Skip fetching prices (faster, for testing)');
    console.log('  --output=FILE    Output file path');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

  // Parse the data
  console.log('🔍 Parsing curriculum items...');
  let items = parseGraphQLResponse(rawData);
  console.log(`   Found ${items.length} total items`);

  // Filter if requested
  if (booksOnly) {
    items = filterBooksOnly(items);
    console.log(`   Filtered to ${items.length} books (excluding supplies/guides)`);
  }

  // Fetch prices
  if (!skipPrices) {
    console.log('\n💰 Fetching individual prices from Sonlight...');
    console.log('   (This may take a minute - being respectful to their servers)\n');

    items = await fetchAllPrices(items, (current, total, title) => {
      const progress = Math.round((current / total) * 100);
      const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
      process.stdout.write(`\r   [${bar}] ${current}/${total} - ${title.substring(0, 30).padEnd(30)}`);
    });

    console.log('\n');
  }

  // Generate summary
  const summary = generateSummary(items);
  console.log('📊 Summary:');
  console.log(`   Total items: ${summary.totalItems}`);
  console.log(`   Items with prices: ${summary.itemsWithPrices}`);
  console.log(`   Total Sonlight value: $${summary.totalValue}`);
  console.log('\n   By Category:');
  Object.entries(summary.byCategory).forEach(([cat, data]) => {
    console.log(`     ${cat}: ${data.count} items ($${data.value.toFixed(2)})`);
  });

  // Export to file
  console.log(`\n📄 Exporting to: ${outputFile}`);

  let result;
  if (useApp) {
    result = generateApp(items, outputFile, {
      curriculumName: 'Intro to World History, Year 2 of 2 (Curriculum C)',
    });
    console.log(`   ✅ Generated app with ${result.itemCount} items`);
  } else if (useCSV) {
    result = exportToCSV(items, outputFile);
    console.log(`   ✅ Exported ${result.rowCount} rows`);
  } else {
    result = await exportToXLSX(items, outputFile);
    console.log(`   ✅ Exported ${result.rowCount} rows`);
  }

  console.log('\n' + '='.repeat(50));
  if (useApp) {
    console.log('✨ Done! Your comparison app is ready.');
    console.log('   - See book covers to verify correct editions');
    console.log('   - Click book titles to view on Sonlight');
    console.log('   - Click "Search HPB" or "ThriftBooks" to find used copies');
    console.log('   - Enter prices you find - they save automatically!');
    console.log('   - Export to CSV when done');
  } else if (useCSV) {
    console.log('✨ Done! Your CSV is ready.');
  } else {
    console.log('✨ Done! Your spreadsheet is ready for Half Price Books comparison.');
    console.log('   - Click "Search" links to find books on HPB');
    console.log('   - Enter HPB prices in the yellow column');
    console.log('   - Savings will calculate automatically!');
  }
  console.log(`\n   Open: ${path.resolve(result.path)}\n`);
}

// Run
main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
