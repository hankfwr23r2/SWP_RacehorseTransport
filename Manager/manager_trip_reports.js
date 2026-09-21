const ROWS_PER_PAGE = 10;
let currentPage = 1;
let searchQuery = '';

function searchTable() {
    searchQuery = document.getElementById('search-input').value.trim().toLowerCase();
    currentPage = 1;
    paginateTable();
}

function paginateTable() {
    const allRows = document.querySelectorAll('.data-table tbody tr');
    const filteredRows = [];

    allRows.forEach(row => {
        if (searchQuery) {
            const text = row.textContent.toLowerCase();
            if (!text.includes(searchQuery)) {
                row.style.display = 'none';
                return;
            }
        }
        filteredRows.push(row);
        row.style.display = '';
    });

    const totalRows = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;

    filteredRows.forEach((row, i) => {
        row.style.display = (i >= start && i < end) ? '' : 'none';
    });

    const info = document.getElementById('pagination-info');
    if (totalRows === 0) {
        info.textContent = 'Không có chuyến đi nào';
    } else {
        info.textContent = `Hiển thị ${start + 1}-${Math.min(end, totalRows)} của ${totalRows} chuyến đi`;
    }

    renderPaginationButtons(totalPages);
}

function renderPaginationButtons(totalPages) {
    const container = document.getElementById('pagination-buttons');
    container.innerHTML = '';

    const btnStyle = 'padding: 4px 10px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; cursor: pointer; color: #64748b; font-family: Inter;';
    const activeStyle = 'padding: 4px 10px; border: none; border-radius: 4px; background: #ea580c; color: white; font-weight: 600; cursor: pointer; font-family: Inter;';

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&lt;';
    prevBtn.style.cssText = btnStyle;
    prevBtn.disabled = currentPage === 1;
    if (prevBtn.disabled) prevBtn.style.opacity = '0.5';
    prevBtn.onclick = () => { currentPage--; paginateTable(); };
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.style.cssText = (i === currentPage) ? activeStyle : btnStyle;
        btn.onclick = () => { currentPage = i; paginateTable(); };
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&gt;';
    nextBtn.style.cssText = btnStyle;
    nextBtn.disabled = currentPage === totalPages;
    if (nextBtn.disabled) nextBtn.style.opacity = '0.5';
    nextBtn.onclick = () => { currentPage++; paginateTable(); };
    container.appendChild(nextBtn);
}

function exportPDF() {
    const element = document.getElementById('report-detail');
    const headerText = element.querySelector('h2').textContent.trim();
    const orderCode = headerText.replace('Báo cáo Chi tiết:', '').trim();
    const defaultName = orderCode || 'BaoCao';

    document.getElementById('pdf-filename').value = defaultName;
    document.getElementById('pdfExportModal').style.display = 'flex';
}

function closePdfModal() {
    document.getElementById('pdfExportModal').style.display = 'none';
}

function confirmExportPDF() {
    const fileName = document.getElementById('pdf-filename').value.trim();
    if (!fileName) {
        document.getElementById('pdf-filename').style.borderColor = '#dc2626';
        return;
    }

    const element = document.getElementById('report-detail');
    const btn = element.querySelector('[onclick="exportPDF()"]');
    btn.style.display = 'none';

    closePdfModal();

    html2pdf().set({
        margin: 10,
        filename: fileName + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save().then(() => {
        btn.style.display = '';
    });
}

paginateTable();
