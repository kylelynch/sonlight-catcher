const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Generates an HPB search URL for a book title
 * @param {string} title - Book title
 * @returns {string} HPB search URL
 */
function getHPBSearchUrl(title) {
  const searchQuery = encodeURIComponent(title);
  return `https://www.hpb.com/search?q=${searchQuery}`;
}

/**
 * Exports items to XLSX with HPB comparison columns
 * @param {Array<object>} items - Items with price data
 * @param {string} outputPath - Path to save XLSX
 * @param {object} options - Export options
 */
async function exportToXLSX(items, outputPath, options = {}) {
  const { curriculumName = 'Sonlight Curriculum' } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sonlight Catcher';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Book Comparison', {
    views: [{ state: 'frozen', ySplit: 1 }], // Freeze header row
  });

  // Define columns
  worksheet.columns = [
    { header: 'SKU', key: 'sku', width: 8 },
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Sonlight Price', key: 'sonlightPrice', width: 14 },
    { header: 'Search HPB', key: 'hpbSearch', width: 12 },
    { header: 'HPB Price', key: 'hpbPrice', width: 12 },
    { header: 'Savings', key: 'savings', width: 12 },
    { header: 'Notes', key: 'notes', width: 25 },
  ];

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }, // Blue
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  // Add data rows
  items.forEach((item, index) => {
    const rowNum = index + 2; // +2 because row 1 is header, and rows are 1-indexed
    const price = parseFloat(item.price) || 0;

    const row = worksheet.addRow({
      sku: item.sku,
      title: item.title,
      category: item.group,
      sonlightPrice: price,
      hpbSearch: 'Search',
      hpbPrice: null, // User fills this in
      savings: { formula: `IF(F${rowNum}="","",(D${rowNum}-F${rowNum}))` },
      notes: '',
    });

    // Make "Search" a clickable hyperlink
    const hpbCell = row.getCell('hpbSearch');
    hpbCell.value = {
      text: 'Search',
      hyperlink: getHPBSearchUrl(item.title),
    };
    hpbCell.font = { color: { argb: 'FF0066CC' }, underline: true };
    hpbCell.alignment = { horizontal: 'center' };

    // Format price columns as currency
    row.getCell('sonlightPrice').numFmt = '"$"#,##0.00';
    row.getCell('hpbPrice').numFmt = '"$"#,##0.00';
    row.getCell('savings').numFmt = '"$"#,##0.00';

    // Light gray background for HPB Price to indicate "fill me in"
    row.getCell('hpbPrice').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF9E6' }, // Light yellow
    };

    // Alternate row colors for readability
    if (index % 2 === 1) {
      ['sku', 'title', 'category', 'sonlightPrice', 'notes'].forEach((col) => {
        row.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }, // Very light gray
        };
      });
    }
  });

  // Add conditional formatting for savings column (green when positive)
  worksheet.addConditionalFormatting({
    ref: `G2:G${items.length + 1}`,
    rules: [
      {
        type: 'cellIs',
        operator: 'greaterThan',
        formulae: ['0'],
        style: {
          font: { color: { argb: 'FF166534' } }, // Dark green text
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFDCFCE7' }, // Light green background
          },
        },
      },
      {
        type: 'cellIs',
        operator: 'lessThan',
        formulae: ['0'],
        style: {
          font: { color: { argb: 'FF991B1B' } }, // Dark red text
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: 'FFFEE2E2' }, // Light red background
          },
        },
      },
    ],
  });

  // Add summary section at the bottom
  const summaryStartRow = items.length + 3;

  worksheet.getCell(`A${summaryStartRow}`).value = 'SUMMARY';
  worksheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 12 };

  worksheet.getCell(`A${summaryStartRow + 1}`).value = 'Total Sonlight:';
  worksheet.getCell(`D${summaryStartRow + 1}`).value = {
    formula: `SUM(D2:D${items.length + 1})`,
  };
  worksheet.getCell(`D${summaryStartRow + 1}`).numFmt = '"$"#,##0.00';
  worksheet.getCell(`D${summaryStartRow + 1}`).font = { bold: true };

  worksheet.getCell(`A${summaryStartRow + 2}`).value = 'Total HPB:';
  worksheet.getCell(`F${summaryStartRow + 2}`).value = {
    formula: `SUM(F2:F${items.length + 1})`,
  };
  worksheet.getCell(`F${summaryStartRow + 2}`).numFmt = '"$"#,##0.00';
  worksheet.getCell(`F${summaryStartRow + 2}`).font = { bold: true };

  worksheet.getCell(`A${summaryStartRow + 3}`).value = 'Total Savings:';
  worksheet.getCell(`G${summaryStartRow + 3}`).value = {
    formula: `SUM(G2:G${items.length + 1})`,
  };
  worksheet.getCell(`G${summaryStartRow + 3}`).numFmt = '"$"#,##0.00';
  worksheet.getCell(`G${summaryStartRow + 3}`).font = { bold: true, color: { argb: 'FF166534' } };

  worksheet.getCell(`A${summaryStartRow + 4}`).value = 'Books priced:';
  worksheet.getCell(`F${summaryStartRow + 4}`).value = {
    formula: `COUNTA(F2:F${items.length + 1})`,
  };
  worksheet.getCell(`F${summaryStartRow + 4}`).font = { bold: true };
  worksheet.getCell(`G${summaryStartRow + 4}`).value = `of ${items.length}`;

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write the file
  await workbook.xlsx.writeFile(outputPath);

  return {
    rowCount: items.length,
    path: outputPath,
  };
}

module.exports = {
  exportToXLSX,
  getHPBSearchUrl,
};
