const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBLCU1xQeNk3vWC31Ezn7i6GdekRUrDik751Zbp5nKzA2NlmUqOVec6daZySyNevB39YCVJDHp8wya/pub?gid=1638839728&single=true&output=csv';
const TIMELINE_PLUGIN_OPTIONS = {
    mode: 'vertical',
    verticalStartPosition: 'left',
    verticalTrigger: '150px'
};

let rawData = [];
let timelineInstance = null;

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

/**
 * Colunas: mapeamento por cabeçalho; senão posições padrão (7 ou 6 colunas).
 */
function normHeaderCell(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function buildPsychColumnMap(headerRow) {
    const n = (headerRow || []).map(normHeaderCell);
    const len = n.length;

    const findIdx = (pred) => {
        for (let i = 0; i < n.length; i++) {
            if (pred(n[i], i)) return i;
        }
        return -1;
    };

    const refIdx = findIdx(h => isReferenceHeaderLabel(h));

    const citacaoIdx = findIdx((h, i) => {
        if (i === refIdx) return false;
        if (h === 'citacao') return true;
        if (h.includes('citacao') && !h.includes('referencia') && !h.includes('refer')) return true;
        return false;
    });

    const ideiasIdx = findIdx((h, i) => {
        if (i === refIdx || i === citacaoIdx) return false;
        if (h.includes('ideia')) return true;
        if (h.includes('contrib')) return true;
        if (h.includes('descri')) return true;
        if (h.includes('teoria') && !h.includes('teorico')) return true;
        if (h === 'texto' || h.startsWith('texto ')) return true;
        return false;
    });

    const autorIdx = findIdx(h =>
        h.includes('autor') ||
        h.includes('teorico') ||
        h.includes('figura') ||
        (h.includes('nome') && !h.includes('primeiro')));

    const correnteIdx = findIdx(h =>
        h.includes('corrente') ||
        h.includes('abordagem') ||
        (h.includes('escola') && !h.includes('ano')));

    const nascIdx = findIdx(h => h.includes('nasc'));
    const marcoIdx = findIdx(h =>
        h.includes('marco') ||
        h.includes('obra') ||
        h.includes('public') ||
        h.includes('evento'));
    const obitoIdx = findIdx(h =>
        h.includes('obito') ||
        h.includes('falec') ||
        h.includes('morte'));

    const anoIdx = findIdx((h, i) => {
        if (i === refIdx) return false;
        if (h === 'ano') return true;
        if (/^ano\b/.test(h) && !h.includes('nasc') && !h.includes('obito') && !h.includes('morte')) return true;
        return false;
    });

    const imagemIdx = findIdx(h =>
        /\b(imagem|foto|midia)\b/.test(h) ||
        (h === 'url' || h.startsWith('url ')));

    const wide = len >= 7;
    const defAnoCol = len > 1 && n[1] === 'ano' ? 1 : -1;
    const defaults = wide
        ? { corrente: 0, autor: 1, nasc: 2, marco: 3, obito: 4, ideias: 5, citacao: -1, referencia: 6, imagem: len > 7 ? 7 : -1, ano: defAnoCol }
        : { corrente: -1, autor: 0, nasc: 1, marco: 2, obito: 3, ideias: 4, citacao: -1, referencia: 5, imagem: len > 6 ? 6 : -1, ano: defAnoCol };

    const pick = (idx, def) => (idx >= 0 && idx < len ? idx : def);

    return {
        corrente: pick(correnteIdx, defaults.corrente),
        autor: pick(autorIdx, defaults.autor),
        nasc: pick(nascIdx, defaults.nasc),
        marco: pick(marcoIdx, defaults.marco),
        obito: pick(obitoIdx, defaults.obito),
        ano: pick(anoIdx, defaults.ano),
        ideias: pick(ideiasIdx, defaults.ideias),
        citacao: pick(citacaoIdx, defaults.citacao),
        referencia: pick(refIdx, defaults.referencia),
        imagem: pick(imagemIdx, defaults.imagem)
    };
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

function buildIdeiasBlock(ideiasHtml, citacaoHtml) {
    let ideiasBlock = (ideiasHtml && ideiasHtml !== '—') ? ideiasHtml : '';
    if (citacaoHtml && citacaoHtml.trim() !== '') {
        const citOneLine = citacaoHtml
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\.+$/g, '');
        if (citOneLine) {
            ideiasBlock = ideiasBlock.replace(/(?:<br\s*\/?>\s*)+$/gi, '').trim();
            if (ideiasBlock && ideiasBlock !== '—') ideiasBlock += ' ';
            ideiasBlock += citOneLine + '.';
        }
    }
    return ideiasBlock || '—';
}

function configureTimelineCardToggle(item, toggleBtn, ideiasBlock, refHtml) {
    if (!item || !toggleBtn) return;

    const ideiasPlainText = plainTextFromHtml(ideiasBlock);
    const hasRefText = !!(refHtml && refHtml !== '—');
    const shouldCollapse = ideiasPlainText.length > 220 || hasRefText;

    item.classList.remove('has-toggle', 'is-expanded');
    if (shouldCollapse) {
        item.classList.add('has-toggle');
        toggleBtn.classList.remove('d-none');
        toggleBtn.textContent = 'Ver mais';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.addEventListener('click', () => {
            const expanded = item.classList.toggle('is-expanded');
            toggleBtn.textContent = expanded ? 'Ver menos' : 'Ver mais';
            toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
        return;
    }

    item.classList.add('is-expanded');
    toggleBtn.classList.add('d-none');
}

function setTimelineCardImage(fig, img, media, authorLine) {
    if (!fig || !img) return;
    const url = (media && media.url) ? String(media.url).trim() : '';
    if (!url || !/^https?:\/\//i.test(url)) return;
    img.src = url;
    img.alt = authorLine || 'Ilustração';
    fig.classList.remove('d-none');
}

function reinitializeTimelinePlugin() {
    if (timelineInstance && typeof timelineInstance.destroy === 'function') {
        timelineInstance.destroy();
        timelineInstance = null;
    }
    if (typeof timeline !== 'function') return;
    timelineInstance = timeline(document.querySelectorAll('.timeline'), TIMELINE_PLUGIN_OPTIONS);
}

function parsePsychRow(row, map) {
    const corIdx = map.corrente;
    return {
        corrente: corIdx >= 0 ? String(psychCell(row, corIdx)).trim() : '',
        autor: String(psychCell(row, map.autor)).trim(),
        nascRaw: psychCell(row, map.nasc),
        marcoRaw: psychCell(row, map.marco),
        obitoRaw: psychCell(row, map.obito),
        anoRaw: map.ano >= 0 ? psychCell(row, map.ano) : '',
        ideias: String(psychCell(row, map.ideias)),
        citacao: map.citacao >= 0 ? String(psychCell(row, map.citacao)) : '',
        referencia: String(psychCell(row, map.referencia)),
        mediaUrl: map.imagem >= 0 ? String(psychCell(row, map.imagem)).trim() : ''
    };
}

function autorVidaLabel(birth, death) {
    const by = birth.year || '';
    const dy = death.year || '';
    if (by && dy) return '(' + by + '-' + dy + ')';
    if (by) return '(' + by + ')';
    if (dy) return '(' + dy + ')';
    return '';
}

function timelineAnchorParts(marco, birth, death) {
    if (marco.year) return marco;
    if (birth.year) return birth;
    if (death.year) return death;
    return { year: '', month: '', day: '' };
}

function convertToTimelineFormat(data) {
    const headerRow = data[0] || [];
    const colMap = buildPsychColumnMap(headerRow);

    const timelineEvents = [];

    data.slice(1).forEach(row => {
        const p = parsePsychRow(row, colMap);
        if (!p.autor) return;

        const birth = parseDateParts(p.nascRaw);
        const marco = parseDateParts(p.marcoRaw);
        const death = parseDateParts(p.obitoRaw);
        const anchor = timelineAnchorParts(marco, birth, death);
        const anoParts = parseDateParts(p.anoRaw);

        const markParts = (() => {
            if (p.anoRaw != null && String(p.anoRaw).trim() !== '') {
                if (anoParts.year) return anoParts;
                const m = String(p.anoRaw).match(/\d{4}/);
                if (m) return { year: m[0], month: '', day: '' };
            }
            return anchor;
        })();

        if (!markParts.year) return;

        const mediaUrl = p.mediaUrl;

        const y = parseInt(markParts.year, 10);
        const vida = autorVidaLabel(birth, death);
        const autorLinha = vida ? p.autor + ' ' + vida : p.autor;
        let anoLinha = '';
        if (p.anoRaw != null && String(p.anoRaw).trim() !== '') {
            anoLinha = String(p.anoRaw).trim();
        } else if (p.marcoRaw != null && String(p.marcoRaw).trim() !== '') {
            anoLinha = String(p.marcoRaw).trim();
        } else {
            anoLinha = markParts.year;
        }

        const anoTrim = (p.anoRaw != null && String(p.anoRaw).trim() !== '') ? String(p.anoRaw).trim() : '';
        const railYearText = anoTrim
            ? (anoTrim.length <= 14 ? anoTrim : (anoParts.year || markParts.year))
            : markParts.year;

        const correnteTxt = p.corrente || '—';
        const ideiasHtml = p.ideias.trim() ? nl2brEscaped(p.ideias) : '—';
        const refHtml = p.referencia.trim() ? nl2brEscaped(p.referencia) : '—';
        const citacaoHtml = p.citacao.trim() ? nl2brEscaped(p.citacao) : '';

        timelineEvents.push({
            year: railYearText,
            yearNum: isNaN(y) ? 0 : y,
            month: markParts.month || '',
            day: markParts.day || '',
            corrente: correnteTxt,
            autorLinha: autorLinha,
            anoLinha: anoLinha,
            ideiasHtml: ideiasHtml,
            citacaoHtml: citacaoHtml,
            referenciaHtml: refHtml,
            media: { url: mediaUrl, caption: '' }
        });
    });

    return timelineEvents;
}

function renderTimeline(data) {
    const list = document.getElementById('vertical-timeline-list');
    const tpl = document.getElementById('timeline-item-template');
    if (!list || !tpl) return;

    const events = convertToTimelineFormat(data).filter(e => e.yearNum > 0);
    events.sort((a, b) => a.yearNum - b.yearNum || String(a.month).localeCompare(String(b.month)) || String(a.day).localeCompare(String(b.day)));

    list.replaceChildren();

    events.forEach(ev => {
        const node = tpl.content.cloneNode(true);
        const correnteEl = node.querySelector('.js-vt-corrente');
        const autorEl = node.querySelector('.js-vt-autor');
        const anoEl = node.querySelector('.js-vt-ano');
        const ideiasEl = node.querySelector('.js-vt-ideias');
        const refEl = node.querySelector('.js-vt-ref');
        const item = node.querySelector('.timeline__item');
        const toggleBtn = node.querySelector('.js-vt-toggle');
        const fig = node.querySelector('.vt-figure');
        const img = node.querySelector('.js-vt-img');

        if (correnteEl) correnteEl.textContent = ev.corrente || 'Corrente psicológica';
        autorEl.textContent = ev.autorLinha || '';
        anoEl.textContent = ev.anoLinha || ev.year || '—';
        if (item) {
            item.setAttribute('data-time', ev.year || '');
        }

        const ideiasBlock = buildIdeiasBlock(ev.ideiasHtml, ev.citacaoHtml);
        ideiasEl.innerHTML = ideiasBlock;

        const ref = ev.referenciaHtml;
        if (refEl) refEl.innerHTML = ref && ref !== '—' ? ref : '—';

        configureTimelineCardToggle(item, toggleBtn, ideiasBlock, ref);
        setTimelineCardImage(fig, img, ev.media, ev.autorLinha);

        list.appendChild(node);
    });

    if (events.length === 0) {
        list.innerHTML = '<div class="timeline__item timeline__item--placeholder"><div class="timeline__content text-muted small">Nenhum registro com ano válido para exibir na linha do tempo.</div></div>';
    }

    reinitializeTimelinePlugin();
}

function verticalTimelinePlaceholderHtml(inner) {
    return '<div class="timeline__item timeline__item--placeholder"><div class="timeline__content">' +
        '<div class="px-2">' + inner + '</div></div></div>';
}

const TABLE_HEADERS_7 = [
    'Corrente',
    'Teórico(a)',
    'Nasc.',
    'Marco',
    'Óbito',
    'Ideias',
    'Referência (ABNT)'
];

const TABLE_HEADERS_6 = [
    'Teórico(a)',
    'Nasc.',
    'Marco',
    'Óbito',
    'Ideias',
    'Referência (ABNT)'
];

function tableDisplayHeaders(colCount) {
    return colCount >= 7 ? TABLE_HEADERS_7 : TABLE_HEADERS_6;
}

function isReferenceHeaderLabel(header) {
    const h = normHeaderCell(header);
    return /\babnt\b/.test(h) ||
        h.includes('referencia') ||
        h.includes('citacao e refer') ||
        (h.includes('citacao') && h.includes('refer'));
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
    if (colIndex === referenceColIndex) {
        return 'Referência (ABNT)';
    }
    const labels = tableDisplayHeaders(colCount);
    if (colIndex < labels.length) {
        return labels[colIndex];
    }
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

    let html = '<div class="table-responsive table-scroll-wrap"><table class="table table-striped table-bordered table-hover align-middle mb-0 table-sticky table-data-psi">';
    html += buildTableColgroupHtml(colCount, referenceColIndex);
    html += buildTableHeadHtml(rawHeaders, colCount, referenceColIndex, labels);
    html += buildTableBodyHtml(data, colCount, referenceColIndex);
    html += '</table></div>';

    document.getElementById('table-content').innerHTML = html;
}

function loadData() {
    const list = document.getElementById('vertical-timeline-list');
    const tableDiv = document.getElementById('table-content');

    tableDiv.innerHTML = loadingHtml('Carregando…');
    if (list) list.innerHTML = verticalTimelinePlaceholderHtml(loadingHtml('Carregando teóricos…'));

    Papa.parse(GOOGLE_SHEET_CSV_URL, {
        download: true,
        header: false,
        complete: function(results) {
            rawData = results.data;
            if (rawData && rawData.length > 1) {
                if (list) list.innerHTML = '';
                renderTimeline(rawData);
                renderTable(rawData);
            } else {
                if (list) list.innerHTML = verticalTimelinePlaceholderHtml(errorHtml('Nenhum dado encontrado na planilha. Verifique se ela tem pelo menos 2 linhas (cabeçalho + dados).'));
                tableDiv.innerHTML = errorHtml('Nenhum dado encontrado.');
            }
        },
        error: function(error) {
            console.error('Erro:', error);
            if (list) list.innerHTML = verticalTimelinePlaceholderHtml(errorHtml('Erro ao carregar a planilha. Verifique se o link está correto e se a planilha está publicada como CSV.'));
            tableDiv.innerHTML = errorHtml('Erro ao carregar os dados.');
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    if (GOOGLE_SHEET_CSV_URL === 'SEU_LINK_DO_CSV_AQUI') {
        const list = document.getElementById('vertical-timeline-list');
        if (list) list.innerHTML = verticalTimelinePlaceholderHtml(errorHtml('Configure a variável GOOGLE_SHEET_CSV_URL no código com o link da sua planilha publicada.'));
        document.getElementById('table-content').innerHTML = errorHtml('Configure a URL da planilha.');
        return;
    }
    loadData();
});
