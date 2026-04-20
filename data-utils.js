function loadingHtml(message) {
    return (
        '<div class="text-center text-muted py-5">' +
        '<div class="spinner-border text-primary mb-3" role="status"><span class="visually-hidden">Carregando…</span></div>' +
        '<p class="mb-0">' + message + '</p>' +
        '</div>'
    );
}

function errorHtml(message) {
    return '<div class="alert alert-danger mb-0" role="alert">' + message + '</div>';
}

function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normHeaderCell(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function psychCell(row, idx) {
    if (idx == null || idx < 0) return '';
    return row[idx] != null ? row[idx] : '';
}

function parseDateParts(dateStr) {
    dateStr = (dateStr == null ? '' : String(dateStr)).trim();
    let year = '';
    let month = '';
    let day = '';
    if (!dateStr) return { year, month, day };
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const p = dateStr.split('-');
        year = p[0];
        month = p[1];
        day = p[2];
    } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const p = dateStr.split('/');
        year = p[2];
        month = p[1];
        day = p[0];
    } else {
        const m = dateStr.match(/\d{4}/);
        year = m ? m[0] : '';
    }
    return { year, month, day };
}

function nl2brEscaped(s) {
    return escapeHtml(s).replace(/\r\n|\r|\n/g, '<br>');
}

function plainTextFromHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html || '';
    return (temp.textContent || temp.innerText || '').trim();
}

function isReferenceHeaderLabel(header) {
    const h = normHeaderCell(header);
    return /\babnt\b/.test(h) ||
        h.includes('referencia') ||
        h.includes('citacao e refer') ||
        (h.includes('citacao') && h.includes('refer'));
}
