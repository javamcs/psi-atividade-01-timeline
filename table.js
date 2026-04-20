const TABLE_HEADERS_7 = [
    'Corrente',
    'Teórico(a)',
    'Marco',
    'Nasc.',
    'Óbito',
    'Ideias',
    'Referência (ABNT)'
];

const TABLE_HEADERS_6 = [
    'Teórico(a)',
    'Marco',
    'Nasc.',
    'Óbito',
    'Ideias',
    'Referência (ABNT)'
];

function tableDisplayHeaders(colCount) {
    return colCount >= 7 ? TABLE_HEADERS_7 : TABLE_HEADERS_6;
}

function detectReferenceColumnIndex(rawHeaders) {
    for (let i = (rawHeaders || []).length - 1; i >= 0; i--) {
        if (isReferenceHeaderLabel(rawHeaders[i])) return i;
    }
    return -1;
}

function tableColClass(colIndex, colCount, referenceColIndex) {
    if (colIndex === referenceColIndex) return 'col-citacao';
    if (colCount >= 7) {
        if (colIndex === 0) return 'col-corrente';
        if (colIndex === 1) return 'col-figura';
        if (colIndex >= 2 && colIndex <= 4) return 'col-data';
        if (colIndex === 5) return 'col-texto';
        if (colIndex === 6) return 'col-citacao';
        return 'col-extra';
    }
    if (colIndex === 0) return 'col-figura';
    if (colIndex >= 1 && colIndex <= 3) return 'col-data';
    if (colIndex === 4) return 'col-texto';
    if (colIndex === 5) return 'col-citacao';
    return 'col-extra';
}

function tableHeaderLabel(colIndex, rawHeader, colCount, referenceColIndex) {
    if (colIndex === referenceColIndex) return 'Referência (ABNT)';
    const labels = tableDisplayHeaders(colCount);
    if (colIndex < labels.length) return labels[colIndex];
    return escapeHtml(rawHeader || '');
}

function tableColumnWidth(colIndex, colCount, referenceColIndex) {
    if (colIndex === referenceColIndex) return '28%';
    if (colCount >= 7) {
        if (colIndex === 0) return '11%';
        if (colIndex === 1) return '12%';
        if (colIndex >= 2 && colIndex <= 4) return '8%';
        if (colIndex === 5) return '27%';
        if (colIndex === 6) return '28%';
        return '8%';
    }
    if (colIndex === 0) return '14%';
    if (colIndex >= 1 && colIndex <= 3) return '7%';
    if (colIndex === 4) return '37%';
    if (colIndex === 5) return '28%';
    return '7%';
}

function buildTableColgroupHtml(colCount, referenceColIndex) {
    let html = '<colgroup>';
    for (let c = 0; c < colCount; c++) {
        const cls = tableColClass(c, colCount, referenceColIndex);
        const width = tableColumnWidth(c, colCount, referenceColIndex);
        html += '<col class="' + cls + '" style="width:' + width + ';">';
    }
    html += '</colgroup>';
    return html;
}

function buildTableHeadHtml(rawHeaders, colCount, referenceColIndex, labels) {
    let html = '<thead class="table-primary"><tr>';
    for (let c = 0; c < colCount; c++) {
        const cls = tableColClass(c, colCount, referenceColIndex);
        const label = tableHeaderLabel(c, rawHeaders[c], colCount, referenceColIndex);
        const titleAttr = c < labels.length && rawHeaders[c]
            ? ' title="' + escapeHtml(String(rawHeaders[c])) + '"'
            : '';
        html += '<th scope="col" class="' + cls + '"' + titleAttr + '>' + label + '</th>';
    }
    html += '</tr></thead>';
    return html;
}

function buildTableBodyHtml(data, colCount, referenceColIndex) {
    let html = '<tbody>';
    for (let i = 1; i < data.length; i++) {
        const row = data[i] || [];
        html += '<tr>';
        for (let c = 0; c < colCount; c++) {
            const cls = tableColClass(c, colCount, referenceColIndex);
            html += '<td class="' + cls + '">' + escapeHtml(row[c]) + '</td>';
        }
        html += '</tr>';
    }
    html += '</tbody>';
    return html;
}

function renderTable(data) {
    if (!data || data.length === 0) return;

    const rawHeaders = data[0];
    const colCount = rawHeaders.length;
    const referenceColIndex = detectReferenceColumnIndex(rawHeaders);
    const labels = tableDisplayHeaders(colCount);

    let html = '<div class="table-responsive table-scroll-wrap"><table class="table table-sm table-bordered align-top mb-0 table-data-psi">';
    html += buildTableColgroupHtml(colCount, referenceColIndex);
    html += buildTableHeadHtml(rawHeaders, colCount, referenceColIndex, labels);
    html += buildTableBodyHtml(data, colCount, referenceColIndex);
    html += '</table></div>';

    document.getElementById('table-content').innerHTML = html;
}
