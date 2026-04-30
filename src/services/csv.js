function escapeCsv(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function toCsv(rows, headers) {
  const headerLine = headers.map((header) => escapeCsv(header.label)).join(",");
  const lines = rows.map((row) => {
    return headers.map((header) => escapeCsv(row[header.key])).join(",");
  });

  return [headerLine, ...lines].join("\n");
}

module.exports = { toCsv };
