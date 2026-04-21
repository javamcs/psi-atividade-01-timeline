function formatLifeRangeLabel(nascYear, obitoYear) {
    const start = nascYear || '?';
    const end = obitoYear || 'Atual';
    return '(' + start + '-' + end + ')';
}

let timesheetSortMode = 'destaque';

function toTimesheetEntry(psychRow) {
    const birth = parseDateParts(psychRow.nascRaw);
    const death = parseDateParts(psychRow.obitoRaw);
    const nascYear = birth.year || '';
    const obitoYear = death.year || '';
    const currentYear = new Date().getFullYear();

    if (!nascYear && !obitoYear) return null;

    const startYear = nascYear || obitoYear;
    let endYear = obitoYear ? obitoYear : String(currentYear);
    const startNum = parseInt(startYear, 10);
    const endNum = parseInt(endYear, 10);
    if (!isNaN(startNum) && !isNaN(endNum) && endNum < startNum) {
        endYear = startYear;
    }

    const corrente = psychRow.corrente ? String(psychRow.corrente).trim() : '';
    const label = psychRow.autor + ' ' + formatLifeRangeLabel(nascYear, obitoYear);

    const highlight = parseDateParts(psychRow.anoRaw).year || parseDateParts(psychRow.marcoRaw).year || '';
    return [startYear, endYear, label, 'lorem', highlight, corrente];
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

function sortTimesheetEntries(entries, mode) {
    const sorted = entries.slice();

    sorted.sort((a, b) => {
        const startA = parseInt(a[0], 10);
        const startB = parseInt(b[0], 10);
        const endA = parseInt(a[1], 10);
        const endB = parseInt(b[1], 10);
        const highlightA = parseInt(a[4], 10);
        const highlightB = parseInt(b[4], 10);
        const correnteA = String(a[5] || '').trim();
        const correnteB = String(b[5] || '').trim();

        if (mode === 'corrente') {
            if (correnteA && !correnteB) return -1;
            if (!correnteA && correnteB) return 1;
            const correnteCmp = correnteA.localeCompare(correnteB, 'pt-BR');
            if (correnteCmp !== 0) return correnteCmp;
            const labelCmp = String(a[2]).localeCompare(String(b[2]), 'pt-BR');
            if (labelCmp !== 0) return labelCmp;
            if (startA !== startB) return startA - startB;
            if (endA !== endB) return endA - endB;
            return 0;
        }

        if (mode === 'destaque') {
            if (!isNaN(highlightA) && !isNaN(highlightB) && highlightA !== highlightB) return highlightA - highlightB;
            if (isNaN(highlightA) && !isNaN(highlightB)) return 1;
            if (!isNaN(highlightA) && isNaN(highlightB)) return -1;
            if (startA !== startB) return startA - startB;
            if (endA !== endB) return endA - endB;
        } else if (mode === 'vida') {
            if (startA !== startB) return startA - startB;
            if (endA !== endB) return endA - endB;
        } else {
            if (endA !== endB) return endA - endB;
            if (startA !== startB) return startA - startB;
        }

        return String(a[2]).localeCompare(String(b[2]), 'pt-BR');
    });

    return sorted;
}

function applyTimesheetTheme(host) {
    if (!host) return;
    const rootStyles = getComputedStyle(document.documentElement);
    const primary = rootStyles.getPropertyValue('--bs-primary').trim() || '#0d6efd';
    const bodyColor = rootStyles.getPropertyValue('--bs-body-color').trim() || '#212529';
    const secondary = rootStyles.getPropertyValue('--bs-secondary-color').trim() || '#6c757d';

    host.querySelectorAll('.data li .bubble').forEach(bubble => {
        bubble.style.backgroundColor = primary;
        bubble.style.opacity = '0.9';
        bubble.style.top = '9px';
    });

    host.querySelectorAll('.data li .label').forEach(label => {
        label.style.color = bodyColor;
    });

    host.querySelectorAll('.data li').forEach(row => {
        row.style.height = '24px';
        row.style.lineHeight = '24px';
        row.style.marginBottom = '6px';
    });

    host.querySelectorAll('.scale section.ts-decade .ts-decade-label').forEach(label => {
        label.style.color = secondary;
    });
}

function applyHighlightMarkers(host, entries, bounds) {
    if (!host) return;
    const scaleCell = host.querySelector('.scale section');
    const yearWidth = scaleCell ? scaleCell.offsetWidth : 0;
    if (!yearWidth || !bounds) return;

    const rows = host.querySelectorAll('.data li');
    rows.forEach((row, idx) => {
        const entry = entries[idx];
        if (!entry) return;
        const startYear = parseInt(entry[0], 10);
        const highlightYear = parseInt(entry[4], 10);
        const corrente = entry[5] ? String(entry[5]).trim() : '';

        const appendYearBadge = (year, className) => {
            if (isNaN(year)) return;
            if (year < bounds.minYear || year > bounds.maxYear) return;
            const yearLabel = document.createElement('span');
            yearLabel.className = className;
            yearLabel.textContent = String(year);
            yearLabel.style.position = 'absolute';
            yearLabel.style.left = ((year - bounds.minYear) * yearWidth) + 'px';
            yearLabel.style.top = '-7px';
            yearLabel.style.transform = 'translateX(-50%)';
            yearLabel.style.fontSize = '9px';
            yearLabel.style.lineHeight = '1';
            yearLabel.style.padding = '2px 5px';
            yearLabel.style.borderRadius = '999px';
            yearLabel.style.background = 'var(--bs-body-bg, #fff)';
            yearLabel.style.border = '1px solid var(--bs-border-color, #dee2e6)';
            yearLabel.style.color = 'var(--bs-secondary-color, #6c757d)';
            yearLabel.style.zIndex = '3';
            yearLabel.style.pointerEvents = 'none';
            row.appendChild(yearLabel);
        };

        if (!isNaN(highlightYear) && highlightYear >= bounds.minYear && highlightYear <= bounds.maxYear) {
            const marker = document.createElement('span');
            marker.className = 'ts-highlight-marker';
            marker.title = 'Ano de destaque: ' + highlightYear;
            marker.style.position = 'absolute';
            marker.style.left = ((highlightYear - bounds.minYear) * yearWidth) + 'px';
            marker.style.top = '8px';
            marker.style.width = '6px';
            marker.style.height = '6px';
            marker.style.background = '#ffffff';
            marker.style.border = '1px solid var(--bs-secondary)';
            marker.style.borderRadius = '50%';
            marker.style.transform = 'translateX(-50%)';
            marker.style.opacity = '0.95';
            marker.style.zIndex = '2';
            marker.style.pointerEvents = 'none';
            row.appendChild(marker);
        }

        appendYearBadge(highlightYear, 'ts-highlight-year');

        if (corrente && !isNaN(startYear)) {
            const correnteLabel = document.createElement('span');
            correnteLabel.className = 'ts-corrente-label';
            correnteLabel.textContent = corrente;
            correnteLabel.style.position = 'absolute';
            correnteLabel.style.left = ((startYear - bounds.minYear) * yearWidth - 8) + 'px';
            correnteLabel.style.top = '4px';
            correnteLabel.style.transform = 'translateX(-100%)';
            correnteLabel.style.fontSize = '9px';
            correnteLabel.style.lineHeight = '1';
            correnteLabel.style.padding = '2px 5px';
            correnteLabel.style.borderRadius = '999px';
            correnteLabel.style.background = 'var(--bs-body-bg, #fff)';
            correnteLabel.style.border = '1px solid var(--bs-border-color, #dee2e6)';
            correnteLabel.style.color = 'var(--bs-secondary-color, #6c757d)';
            correnteLabel.style.zIndex = '3';
            correnteLabel.style.pointerEvents = 'none';
            row.appendChild(correnteLabel);
        }
    });
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

    // Respiro no início: evita que a primeira barra fique colada/cortada na borda esquerda.
    const minPadded = Math.max(1, minYear - 10);
    // Respiro no fim: espaço à direita para a última barra e leitura da escala.
    const maxPadded = maxYear + 30;

    return { minYear: minPadded, maxYear: maxPadded, dataMinYear: minYear, dataMaxYear: maxYear };
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
        section.textContent = '';
        if (isDecade) {
            const label = document.createElement('span');
            label.className = 'ts-decade-label';
            label.textContent = String(year);
            section.appendChild(label);
        }
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

    const baseEntries = buildTimesheetEntries(data);
    console.group('[Timesheet] Debug');
    console.log('Total de linhas brutas (sem cabeçalho):', Math.max((data?.length || 1) - 1, 0));
    console.log('Entradas convertidas para Timesheet:', baseEntries.length);
    console.log('Preview das 10 primeiras entradas:', baseEntries.slice(0, 10));

    if (baseEntries.length === 0) {
        console.warn('Nenhuma entrada válida para desenhar.');
        console.groupEnd();
        container.innerHTML = errorHtml('Nenhum dado com nascimento/óbito válido para o Timesheet.');
        return;
    }

    const bounds = getTimesheetBounds(baseEntries);
    if (!bounds) {
        console.warn('Sem intervalo de anos válido.');
        console.groupEnd();
        container.innerHTML = errorHtml('Não foi possível calcular o intervalo de anos para o Timesheet.');
        return;
    }
    console.log(
        'Intervalo dos dados:',
        bounds.dataMinYear,
        '->',
        bounds.dataMaxYear,
        '| Escala (com respiro):',
        bounds.minYear,
        '->',
        bounds.maxYear
    );

    container.innerHTML = `
        <div class="d-flex justify-content-end align-items-center gap-2 mb-2">
            <label for="timesheet-sort-select" class="small text-muted mb-0">Ordenar por:</label>
            <select id="timesheet-sort-select" class="form-select form-select-sm" style="width: auto;">
                <option value="corrente">Corrente (A-Z)</option>
                <option value="destaque">Ano Destaque</option>
                <option value="obito">Óbito/Atual</option>
                <option value="vida">Nascimento</option>
            </select>
        </div>
        <div id="timesheet"></div>
    `;

    const draw = () => {
        const entries = sortTimesheetEntries(baseEntries, timesheetSortMode);
        const host = document.getElementById('timesheet');
        if (!host) return;
        host.innerHTML = '';
        const timesheetData = entries.map(entry => entry.slice(0, 4));
        new Timesheet('timesheet', bounds.minYear, bounds.maxYear, timesheetData);
        container.style.overflowY = 'visible';
        container.style.maxHeight = 'none';
        container.style.paddingBottom = '12px';
        host.style.height = 'auto';
        host.style.minHeight = '0';
        host.style.overflowY = 'visible';
        const dataList = host.querySelector('.data');
        if (dataList) {
            dataList.style.overflow = 'visible';
            dataList.style.maxHeight = 'none';
        }
        applyDecadeScale(host);
        applyTimesheetTheme(host);
        applyHighlightMarkers(host, entries, bounds);
        container.scrollTop = 0;
        container.scrollLeft = 0;
    };

    // Ensure drawing happens after layout is settled (tab visible + measured width).
    requestAnimationFrame(() => {
        const sortSelect = document.getElementById('timesheet-sort-select');
        if (sortSelect) {
            sortSelect.value = timesheetSortMode;
            sortSelect.addEventListener('change', event => {
                const newMode = event.target.value;
                timesheetSortMode = newMode === 'vida' || newMode === 'destaque' || newMode === 'corrente' ? newMode : 'obito';
                draw();
            });
        }

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
