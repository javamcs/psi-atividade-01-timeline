const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBLCU1xQeNk3vWC31Ezn7i6GdekRUrDik751Zbp5nKzA2NlmUqOVec6daZySyNevB39YCVJDHp8wya/pub?gid=1638839728&single=true&output=csv';

let rawData = [];

function renderTimesheetIfPossible() {
    if (!rawData || rawData.length <= 1) return;
    renderTimesheet(rawData);
}

function isTimesheetTabActive() {
    const pane = document.getElementById('timesheet-pane');
    return !!(pane && pane.classList.contains('active') && pane.classList.contains('show'));
}

function initTimesheetTabHandlers() {
    const tabButton = document.getElementById('timesheet-tab');
    if (!tabButton) return;

    tabButton.addEventListener('shown.bs.tab', () => {
        // Re-render when tab becomes visible so the library can calculate widths correctly.
        renderTimesheetIfPossible();
    });
}

function loadData() {
    const list = document.getElementById('vertical-timeline-list');
    const tableDiv = document.getElementById('table-content');
    const timesheetDiv = document.getElementById('timesheet-content');

    tableDiv.innerHTML = loadingHtml('Carregando…');
    if (list) list.innerHTML = verticalTimelinePlaceholderHtml(loadingHtml('Carregando teóricos…'));
    if (timesheetDiv) timesheetDiv.innerHTML = loadingHtml('Carregando timesheet…');

    Papa.parse(GOOGLE_SHEET_CSV_URL, {
        download: true,
        header: false,
        complete: function(results) {
            rawData = results.data;
            if (rawData && rawData.length > 1) {
                if (list) list.innerHTML = '';
                renderTimeline(rawData);
                renderTable(rawData);
                if (isTimesheetTabActive()) {
                    renderTimesheet(rawData);
                } else if (timesheetDiv) {
                    timesheetDiv.innerHTML = '<p class="small text-muted mb-0">Abra a aba Timesheet para carregar a visualização.</p>';
                }
            } else {
                if (list) list.innerHTML = verticalTimelinePlaceholderHtml(errorHtml('Nenhum dado encontrado na planilha. Verifique se ela tem pelo menos 2 linhas (cabeçalho + dados).'));
                tableDiv.innerHTML = errorHtml('Nenhum dado encontrado.');
                if (timesheetDiv) timesheetDiv.innerHTML = errorHtml('Nenhum dado encontrado.');
            }
        },
        error: function(error) {
            console.error('Erro:', error);
            if (list) list.innerHTML = verticalTimelinePlaceholderHtml(errorHtml('Erro ao carregar a planilha. Verifique se o link está correto e se a planilha está publicada como CSV.'));
            tableDiv.innerHTML = errorHtml('Erro ao carregar os dados.');
            if (timesheetDiv) timesheetDiv.innerHTML = errorHtml('Erro ao carregar os dados.');
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initTimesheetTabHandlers();

    if (GOOGLE_SHEET_CSV_URL === 'SEU_LINK_DO_CSV_AQUI') {
        const list = document.getElementById('vertical-timeline-list');
        const timesheetDiv = document.getElementById('timesheet-content');
        if (list) list.innerHTML = verticalTimelinePlaceholderHtml(errorHtml('Configure a variável GOOGLE_SHEET_CSV_URL no código com o link da sua planilha publicada.'));
        document.getElementById('table-content').innerHTML = errorHtml('Configure a URL da planilha.');
        if (timesheetDiv) timesheetDiv.innerHTML = errorHtml('Configure a URL da planilha.');
        return;
    }
    loadData();
});
