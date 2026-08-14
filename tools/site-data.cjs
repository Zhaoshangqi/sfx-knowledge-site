const MARKERS = Object.freeze({
  records: '    const records = ',
  imageManifest: '    const imageManifest = ',
  pluginReferenceCatalog: '    const pluginReferenceCatalog = '
});

function locateMarker(html, name) {
  const marker = MARKERS[name];
  const first = html.indexOf(marker);
  if (first === -1) {
    throw new Error(`Missing ${name} marker`);
  }
  if (html.indexOf(marker, first + 1) !== -1) {
    throw new Error(`Duplicate ${name} marker`);
  }
  return first;
}

function parseSection(html, markerName, markerIndex, nextMarkerIndex) {
  const literalStart = markerIndex + MARKERS[markerName].length;
  const section = html.slice(literalStart, nextMarkerIndex);
  const boundary = section.match(/;[ \t\r\n]*$/);
  if (!boundary) {
    throw new Error(`Malformed ${markerName} boundary: expected a terminating semicolon`);
  }

  const literalEnd = literalStart + boundary.index;
  const literal = html.slice(literalStart, literalEnd);
  try {
    return {
      value: JSON.parse(literal),
      literalStart,
      literalEnd
    };
  } catch (error) {
    throw new Error(`Malformed ${markerName} JSON: ${error.message}`);
  }
}

function inspect(html) {
  if (typeof html !== 'string') {
    throw new TypeError('html must be a string');
  }

  const recordsIndex = locateMarker(html, 'records');
  const imageManifestIndex = locateMarker(html, 'imageManifest');
  const pluginReferenceCatalogIndex = locateMarker(html, 'pluginReferenceCatalog');
  if (!(recordsIndex < imageManifestIndex && imageManifestIndex < pluginReferenceCatalogIndex)) {
    throw new Error('Site data markers are out of order');
  }

  const recordsSection = parseSection(html, 'records', recordsIndex, imageManifestIndex);
  const imageManifestSection = parseSection(
    html,
    'imageManifest',
    imageManifestIndex,
    pluginReferenceCatalogIndex
  );
  if (!Array.isArray(recordsSection.value)) {
    throw new TypeError('records must be an array');
  }
  if (
    imageManifestSection.value === null
    || typeof imageManifestSection.value !== 'object'
    || Array.isArray(imageManifestSection.value)
    || Object.getPrototypeOf(imageManifestSection.value) !== Object.prototype
  ) {
    throw new TypeError('imageManifest must be a non-null plain JSON object');
  }

  return {
    records: recordsSection.value,
    imageManifest: imageManifestSection.value,
    recordsLiteralStart: recordsSection.literalStart,
    recordsLiteralEnd: recordsSection.literalEnd
  };
}

function parse(html) {
  const data = inspect(html);
  return {
    records: data.records,
    imageManifest: data.imageManifest
  };
}

function replaceRecords(html, records) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  const data = inspect(html);
  const firstNewline = html.indexOf('\n');
  const newline = firstNewline > 0 && html[firstNewline - 1] === '\r' ? '\r\n' : '\n';
  const literal = JSON.stringify(records, null, 2).replace(/\n/g, newline);
  return html.slice(0, data.recordsLiteralStart) + literal + html.slice(data.recordsLiteralEnd);
}

module.exports = Object.freeze({ parse, replaceRecords });
