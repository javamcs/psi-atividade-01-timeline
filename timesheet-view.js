function formatLifeRangeLabel(nascYear, obitoYear) {
    const start = nascYear || '?';
    const end = obitoYear || '?';
    return '(' + start + '-' + end + ')';
}

function toTimesheetEntry(psychRow) {
    const birth = parseDateParts(psychRow.nascRaw);
    const death = parseDateParts(psychRow.obitoRaw);
    const nascYear = birth.year || '';
    const obitoYear = death.year || '';

    if (!nascYear && !obitoYear) return null;

    const startYear = nascYear || obitoYear;
    const endYear = obitoYear || nascYear;
    const corrente = psychRow.corrente ? ' - ' + psychRow.corrente : '';
    const label = psychRow.autor + ' ' + formatLifeRangeLabel(nascYear, obitoYear) + corrente;

    return [startYear, endYear, label, 'lorem'];
}

function buildTimesheetEntries(data) {
    const headerRow = data[0] || [];
    const colMap = buildPsychColumnMap(headerRow);
    const entries = [];

    data.slice(1).forEach(row => {
        const psych = parsePsychRow(row, colMap);
        if (!psych.autor) return;
        const entry = toTimesheetEntry(psych);
        if (entry) entries.push(entry);
    });

    return entries;
}

function getTimesheetBounds(entries) {
    let minYear = Number.POSITIVE_INFINITY;
    let maxYear = Number.NEGATIVE_INFINITY;

    entries.forEach(entry => {
        const start = parseInt(entry[0], 10);
        const end = parseInt(entry[1], 10);
        if (!isNaN(start)) minYear = Math.min(minYear, start);
        if (!isNaN(end)) maxYear = Math.max(maxYear, end);
    });

    if (!isFinite(minYear) || !isFinite(maxYear)) return null;
    return { minYear, maxYear };
}

function applyDecadeScale(host) {
    if (!host) return;
    const sections = host.querySelectorAll('.scale section');
    sections.forEach(section => {
        const year = parseInt(section.textContent, 10);
        if (isNaN(year)) return;
        const isDecade = year % 10 === 0;
        section.classList.toggle('ts-decade', isDecade);
        section.classList.toggle('ts-year', !isDecade);
        section.textContent = isDecade ? String(year) : '';
        section.title = String(year);
    });
}

function renderTimesheet(data) {
    const container = document.getElementById('timesheet-content');
    if (!container) return;

    if (typeof Timesheet !== 'function') {
        container.innerHTML = errorHtml('Biblioteca Timesheet não encontrada.');
        return;
    }

    const entries = buildTimesheetEntries(data);
    console.group('[Timesheet] Debug');
    console.log('Total de linhas brutas (sem cabeçalho):', Math.max((data?.length || 1) - 1, 0));
    console.log('Entradas convertidas para Timesheet:', entries.length);
    console.log('Preview das 10 primeiras entradas:', entries.slice(0, 10));

    if (entries.length === 0) {
        console.warn('Nenhuma entrada válida para desenhar.');
        console.groupEnd();
        container.innerHTML = errorHtml('Nenhum dado com nascimento/óbito válido para o Timesheet.');
        return;
    }

    const bounds = getTimesheetBounds(entries);
    if (!bounds) {
        console.warn('Sem intervalo de anos válido.');
        console.groupEnd();
        container.innerHTML = errorHtml('Não foi possível calcular o intervalo de anos para o Timesheet.');
        return;
    }
    console.log('Intervalo calculado:', bounds.minYear, '->', bounds.maxYear);

    container.innerHTML = '<div id="timesheet"></div>';

    const draw = () => {
        const host = document.getElementById('timesheet');
        if (!host) return;
        host.innerHTML = '';
        new Timesheet('timesheet', bounds.minYear, bounds.maxYear, entries);
        applyDecadeScale(host);
        container.scrollTop = 0;
        container.scrollLeft = 0;
    };

    // Ensure drawing happens after layout is settled (tab visible + measured width).
    requestAnimationFrame(() => {
        draw();
        const firstScaleCell = container.querySelector('#timesheet .scale section');
        console.log('Largura da primeira célula da escala:', firstScaleCell ? firstScaleCell.offsetWidth : 0);
        if (!firstScaleCell || firstScaleCell.offsetWidth === 0) {
            console.warn('Escala sem largura; aplicando redraw com delay.');
            setTimeout(draw, 60);
        }
        console.groupEnd();
    });
}
