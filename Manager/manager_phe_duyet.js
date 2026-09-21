let currentHorseIndex = 0;
let currentTab = 'pending';
let activeRow = null;

function updateHorseCarousel() {
    const horses = document.querySelectorAll('.horse-checklist');
    horses.forEach((h, idx) => {
        h.style.display = (idx === currentHorseIndex) ? 'block' : 'none';
    });
    document.getElementById('horse-page-indicator').innerText = `${currentHorseIndex + 1} / ${horses.length}`;
}

function prevHorse() {
    if (currentHorseIndex > 0) {
        currentHorseIndex--;
        updateHorseCarousel();
    }
}

function nextHorse() {
    const horses = document.querySelectorAll('.horse-checklist');
    if (currentHorseIndex < horses.length - 1) {
        currentHorseIndex++;
        updateHorseCarousel();
    }
}

function checkAllHorses() {
    const checkboxes = document.querySelectorAll('.doc-check');
    checkboxes.forEach(cb => cb.checked = true);
    validateChecklist();
}

function openModal(btn) {
    activeRow = btn.closest('tr');
    document.getElementById('feasibilityModal').style.display = 'flex';
    const checkboxes = document.querySelectorAll('.doc-check');
    checkboxes.forEach(cb => cb.checked = false);
    currentHorseIndex = 0;
    updateHorseCarousel();
    validateChecklist();
}

function closeModal() {
    document.getElementById('feasibilityModal').style.display = 'none';
    hideRejectReason();
    activeRow = null;
}

function showRejectReason() {
    const box = document.getElementById('reject-reason-box');
    const input = document.getElementById('reject-reason-input');

    if (box.style.display === 'block') {
        if (!input.value.trim()) {
            box.style.animation = 'none';
            box.offsetHeight;
            box.style.animation = 'shake 0.4s ease';
            input.style.borderColor = '#dc2626';
            input.placeholder = '⚠ Vui lòng nhập lý do từ chối!';
            input.focus();
        }
        return;
    }

    box.style.display = 'block';
    box.style.animation = 'slideDown 0.3s ease';
    document.getElementById('btn-reject').style.display = 'none';
    input.focus();
}

function hideRejectReason() {
    document.getElementById('reject-reason-box').style.display = 'none';
    document.getElementById('reject-reason-input').value = '';
    document.getElementById('reject-reason-input').style.borderColor = '#fecaca';
    document.getElementById('reject-reason-input').placeholder = 'Nhập lý do từ chối đơn hàng...';
    document.getElementById('btn-reject').style.display = '';
}

function confirmReject() {
    const box = document.getElementById('reject-reason-box');
    const input = document.getElementById('reject-reason-input');

    if (!input.value.trim()) {
        box.style.animation = 'none';
        box.offsetHeight;
        box.style.animation = 'shake 0.4s ease';
        input.style.borderColor = '#dc2626';
        input.placeholder = '⚠ Vui lòng nhập lý do từ chối!';
        input.focus();
        return;
    }

    if (activeRow) {
        changeRowStatus(activeRow, 'rejected', input.value.trim());
    }
    closeModal();
}

function approveOrder() {
    if (activeRow) {
        changeRowStatus(activeRow, 'approved');
    }
    closeModal();
}

function changeRowStatus(row, status, reason) {
    row.setAttribute('data-status', status);

    const badgeCell = row.querySelector('.badge');
    const actionCell = row.querySelector('.text-right');
    const orderId = row.querySelector('td').textContent;

    if (status === 'approved') {
        badgeCell.className = 'badge badge-success';
        badgeCell.textContent = 'Đã phê duyệt';
        actionCell.innerHTML = '<span style="color: #16a34a; font-weight: 600; font-size: 0.85rem;"><i class="fa-solid fa-circle-check"></i> Đã duyệt</span>';
        showToast('Đã phê duyệt đơn hàng ' + orderId, 'success');
    } else if (status === 'rejected') {
        badgeCell.className = 'badge badge-danger';
        badgeCell.textContent = 'Từ chối';
        row.setAttribute('data-reason', reason || '');
        actionCell.innerHTML = '<button onclick="viewRejectReason(this)" style="padding: 6px 12px; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-weight: 600; font-family: Inter; font-size: 0.85rem;"><i class="fa-solid fa-eye"></i> Xem lý do</button>';
        showToast('Đã từ chối đơn hàng ' + orderId, 'error');
    }

    updateCounts();
    paginateTable();
}

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;

    document.querySelectorAll('.status-tab').forEach(t => {
        t.classList.remove('active-tab');
        if (t.getAttribute('data-tab') === tab) {
            t.classList.add('active-tab');
        }
    });

    updateCounts();
    paginateTable();
}

function updateCounts() {
    const rows = document.querySelectorAll('.data-table tbody tr');
    let pending = 0, approved = 0, rejected = 0;
    rows.forEach(row => {
        const s = row.getAttribute('data-status');
        if (s === 'pending') pending++;
        else if (s === 'approved') approved++;
        else if (s === 'rejected') rejected++;
    });
    document.getElementById('count-pending').textContent = pending;
    document.getElementById('count-approved').textContent = approved;
    document.getElementById('count-rejected').textContent = rejected;
}

function validateChecklist() {
    const checkboxes = document.querySelectorAll('.doc-check');
    const totalChecks = checkboxes.length;
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

    document.getElementById('checklist-counter').innerText = `${checkedCount}/${totalChecks} hoàn tất`;

    const btnApprove = document.getElementById('btn-approve');

    if (checkedCount === totalChecks) {
        btnApprove.disabled = false;
        btnApprove.classList.remove('btn-disabled');
        btnApprove.classList.add('btn-active');
    } else {
        btnApprove.disabled = true;
        btnApprove.classList.add('btn-disabled');
        btnApprove.classList.remove('btn-active');
    }
}

const ROWS_PER_PAGE = 10;
let currentPage = 1;

function paginateTable() {
    const allRows = document.querySelectorAll('.data-table tbody tr');
    const filteredRows = [];

    allRows.forEach(row => {
        if (row.getAttribute('data-status') !== currentTab) {
            row.style.display = 'none';
            return;
        }
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
        info.textContent = 'Không có đơn hàng nào';
    } else {
        info.textContent = `Hiển thị ${start + 1}-${Math.min(end, totalRows)} của ${totalRows} Đơn hàng`;
    }

    renderPaginationButtons(totalPages);
}

function renderPaginationButtons(totalPages) {
    const container = document.getElementById('pagination-buttons');
    container.innerHTML = '';

    const btnStyle = 'padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; cursor: pointer; color: #64748b; font-family: Inter;';
    const activeStyle = 'padding: 6px 12px; border: none; border-radius: 4px; background: #ea580c; color: white; font-weight: 600; cursor: pointer; font-family: Inter;';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Trang trước';
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
    nextBtn.textContent = 'Trang sau';
    nextBtn.style.cssText = btnStyle;
    nextBtn.disabled = currentPage === totalPages;
    if (nextBtn.disabled) nextBtn.style.opacity = '0.5';
    nextBtn.onclick = () => { currentPage++; paginateTable(); };
    container.appendChild(nextBtn);
}

function viewRejectReason(btn) {
    const row = btn.closest('tr');
    const reason = row.getAttribute('data-reason');
    const orderId = row.querySelector('td').textContent;

    const overlay = document.getElementById('rejectReasonModal');
    document.getElementById('reject-modal-order-id').textContent = orderId;
    document.getElementById('reject-modal-reason').textContent = reason;
    overlay.style.display = 'flex';
}

function closeRejectReasonModal() {
    document.getElementById('rejectReasonModal').style.display = 'none';
}

let searchQuery = '';

function searchTable() {
    searchQuery = document.getElementById('search-input').value.trim().toLowerCase();
    currentPage = 1;
    paginateTable();
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.textContent = message;
    const bgColor = type === 'success' ? '#16a34a' : '#dc2626';
    const icon = type === 'success' ? '✓' : '✕';
    toast.innerHTML = '<span style="margin-right: 8px; font-weight: bold;">' + icon + '</span>' + message;
    toast.style.cssText = 'position: fixed; top: 24px; right: 24px; background: ' + bgColor + '; color: white; padding: 14px 20px; border-radius: 8px; font-family: Inter; font-size: 0.9rem; font-weight: 500; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease, fadeOut 0.4s ease 2.6s forwards;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

updateCounts();
paginateTable();
