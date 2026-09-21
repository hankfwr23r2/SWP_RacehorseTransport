let currentTab = 'pending';
let activeRow = null;
const ROWS_PER_PAGE = 10;
let currentPage = 1;
let searchQuery = '';

function openQuoteModal(btn) {
    activeRow = btn.closest('tr');
    const orderId = activeRow.querySelector('td').textContent;
    document.getElementById('modal-order-id').innerText = orderId;
    document.getElementById('quoteDetailModal').style.display = 'flex';
    hideRejectReason();
}

function closeQuoteModal() {
    document.getElementById('quoteDetailModal').style.display = 'none';
    hideRejectReason();
    activeRow = null;
}

function showRejectReason() {
    var box = document.getElementById('tn-reject-reason-box');
    var input = document.getElementById('tn-reject-reason-input');

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
    document.getElementById('tn-btn-reject').style.display = 'none';
    input.focus();
}

function hideRejectReason() {
    document.getElementById('tn-reject-reason-box').style.display = 'none';
    document.getElementById('tn-reject-reason-input').value = '';
    document.getElementById('tn-reject-reason-input').style.borderColor = '#fecaca';
    document.getElementById('tn-reject-reason-input').placeholder = 'Nhập lý do từ chối báo giá...';
    document.getElementById('tn-btn-reject').style.display = '';
}

function confirmReject() {
    var box = document.getElementById('tn-reject-reason-box');
    var input = document.getElementById('tn-reject-reason-input');

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
    closeQuoteModal();
}

function approveQuote() {
    if (activeRow) {
        changeRowStatus(activeRow, 'approved');
    }
    closeQuoteModal();
}

function changeRowStatus(row, status, reason) {
    row.setAttribute('data-status', status);

    var badgeCell = row.querySelector('.badge');
    var actionCell = row.querySelector('.text-right');
    var orderId = row.querySelector('td').textContent;

    if (status === 'approved') {
        badgeCell.className = 'badge badge-success';
        badgeCell.textContent = 'Đã gửi Báo giá';
        actionCell.innerHTML = '<span style="color: #16a34a; font-weight: 600; font-size: 0.85rem;">Đã gửi</span>';
        showToast('Đã phê duyệt & gửi báo giá ' + orderId, 'success');
    } else if (status === 'rejected') {
        badgeCell.className = 'badge badge-danger';
        badgeCell.textContent = 'Từ chối';
        row.setAttribute('data-reason', reason || '');
        actionCell.innerHTML = '<button onclick="viewRejectReason(this)" style="padding: 6px 12px; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-weight: 600; font-family: Inter; font-size: 0.85rem;">Xem lý do</button>';
        showToast('Đã từ chối báo giá ' + orderId, 'error');
    }

    updateCounts();
    paginateTable();
}

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;

    document.querySelectorAll('.status-tab').forEach(function(t) {
        t.classList.remove('active-tab');
        if (t.getAttribute('data-tab') === tab) {
            t.classList.add('active-tab');
        }
    });

    updateCounts();
    paginateTable();
}

function updateCounts() {
    var rows = document.querySelectorAll('.data-table tbody tr');
    var pending = 0, approved = 0, rejected = 0;
    rows.forEach(function(row) {
        var s = row.getAttribute('data-status');
        if (s === 'pending') pending++;
        else if (s === 'approved') approved++;
        else if (s === 'rejected') rejected++;
    });
    document.getElementById('count-pending').textContent = pending;
    document.getElementById('count-approved').textContent = approved;
    document.getElementById('count-rejected').textContent = rejected;
}

function paginateTable() {
    var allRows = document.querySelectorAll('.data-table tbody tr');
    var filteredRows = [];

    allRows.forEach(function(row) {
        if (row.getAttribute('data-status') !== currentTab) {
            row.style.display = 'none';
            return;
        }
        if (searchQuery) {
            var text = row.textContent.toLowerCase();
            if (!text.includes(searchQuery)) {
                row.style.display = 'none';
                return;
            }
        }
        filteredRows.push(row);
        row.style.display = '';
    });

    var totalRows = filteredRows.length;
    var totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));

    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * ROWS_PER_PAGE;
    var end = start + ROWS_PER_PAGE;

    filteredRows.forEach(function(row, i) {
        row.style.display = (i >= start && i < end) ? '' : 'none';
    });

    var info = document.getElementById('pagination-info');
    if (totalRows === 0) {
        info.textContent = 'Không có yêu cầu nào';
    } else {
        info.textContent = 'Hiển thị ' + (start + 1) + '-' + Math.min(end, totalRows) + ' của ' + totalRows + ' yêu cầu';
    }

    renderPaginationButtons(totalPages);
}

function renderPaginationButtons(totalPages) {
    var container = document.getElementById('pagination-buttons');
    container.innerHTML = '';

    var btnStyle = 'padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; cursor: pointer; color: #64748b; font-family: Inter;';
    var activeStyle = 'padding: 6px 12px; border: none; border-radius: 4px; background: #ea580c; color: white; font-weight: 600; cursor: pointer; font-family: Inter;';

    var prevBtn = document.createElement('button');
    prevBtn.textContent = 'Trang trước';
    prevBtn.style.cssText = btnStyle;
    prevBtn.disabled = currentPage === 1;
    if (prevBtn.disabled) prevBtn.style.opacity = '0.5';
    prevBtn.onclick = function() { currentPage--; paginateTable(); };
    container.appendChild(prevBtn);

    for (var i = 1; i <= totalPages; i++) {
        var btn = document.createElement('button');
        btn.textContent = i;
        btn.style.cssText = (i === currentPage) ? activeStyle : btnStyle;
        (function(page) {
            btn.onclick = function() { currentPage = page; paginateTable(); };
        })(i);
        container.appendChild(btn);
    }

    var nextBtn = document.createElement('button');
    nextBtn.textContent = 'Trang sau';
    nextBtn.style.cssText = btnStyle;
    nextBtn.disabled = currentPage === totalPages;
    if (nextBtn.disabled) nextBtn.style.opacity = '0.5';
    nextBtn.onclick = function() { currentPage++; paginateTable(); };
    container.appendChild(nextBtn);
}

function searchTable() {
    searchQuery = document.getElementById('search-input').value.trim().toLowerCase();
    currentPage = 1;
    paginateTable();
}

function viewRejectReason(btn) {
    var row = btn.closest('tr');
    var reason = row.getAttribute('data-reason');
    var orderId = row.querySelector('td').textContent;

    document.getElementById('reject-modal-order-id').textContent = orderId;
    document.getElementById('reject-modal-reason').textContent = reason;
    document.getElementById('rejectReasonModal').style.display = 'flex';
}

function closeRejectReasonModal() {
    document.getElementById('rejectReasonModal').style.display = 'none';
}

function showToast(message, type) {
    var toast = document.createElement('div');
    var bgColor = type === 'success' ? '#16a34a' : '#dc2626';
    var icon = type === 'success' ? '✓' : '✕';
    toast.innerHTML = '<span style="margin-right: 8px; font-weight: bold;">' + icon + '</span>' + message;
    toast.style.cssText = 'position: fixed; top: 24px; right: 24px; background: ' + bgColor + '; color: white; padding: 14px 20px; border-radius: 8px; font-family: Inter; font-size: 0.9rem; font-weight: 500; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease, fadeOut 0.4s ease 2.6s forwards;';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}

updateCounts();
paginateTable();
