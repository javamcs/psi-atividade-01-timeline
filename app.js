const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBLCU1xQeNk3vWC31Ezn7i6GdekRUrDik751Zbp5nKzA2NlmUqOVec6daZySyNevB39YCVJDHp8wya/pub?gid=1638839728&single=true&output=csv';

let rawData = [];

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
