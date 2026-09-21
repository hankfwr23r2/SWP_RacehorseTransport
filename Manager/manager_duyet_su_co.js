var currentTab = 'pending';
var activeRow = null;
var ROWS_PER_PAGE = 10;
var currentPage = 1;
var searchQuery = '';

function openIncidentModal(btn) {
    activeRow = btn.closest('tr');
    var tripId = activeRow.querySelector('td').textContent;
    var status = activeRow.getAttribute('data-status');
    document.getElementById('modal-incident-id').innerText = tripId;
    document.getElementById('incidentModal').style.display = 'flex';
    hideRejectReason();
    hideApproveDirective();

    var actionButtons = document.getElementById('action-buttons');
    var resultBox = document.getElementById('modal-result-box');

    if (status === 'approved') {
        actionButtons.style.display = 'none';
        var directive = activeRow.getAttribute('data-directive') || '';
        resultBox.style.display = 'block';
        resultBox.innerHTML = '<div style="padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">' +
            '<p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #16a34a; font-weight: 600; margin: 0 0 8px 0;">Chỉ đạo xử lý của Manager</p>' +
            '<p style="margin: 0; color: #166534; font-size: 0.88rem; line-height: 1.6;">' + directive + '</p></div>';
    } else if (status === 'rejected') {
        actionButtons.style.display = 'none';
        var reason = activeRow.getAttribute('data-reason') || '';
        resultBox.style.display = 'block';
        resultBox.innerHTML = '<div style="padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">' +
            '<p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #dc2626; font-weight: 600; margin: 0 0 8px 0;">Lý do từ chối</p>' +
            '<p style="margin: 0; color: #991b1b; font-size: 0.88rem; line-height: 1.6;">' + reason + '</p></div>';
    } else {
        actionButtons.style.display = 'flex';
        resultBox.style.display = 'none';
    }
}

function closeIncidentModal() {
    document.getElementById('incidentModal').style.display = 'none';
    hideRejectReason();
    hideApproveDirective();
    document.getElementById('modal-result-box').style.display = 'none';
    document.getElementById('action-buttons').style.display = 'flex';
    activeRow = null;
}

function showRejectReason() {
    hideApproveDirective();
    var box = document.getElementById('reject-reason-box');
    var input = document.getElementById('reject-reason-input');

    if (box.style.display === 'block') {
        if (!input.value.trim()) {
            box.style.animation = 'none';
            box.offsetHeight;
            box.style.animation = 'shake 0.4s ease';
            input.style.borderColor = '#dc2626';
            input.placeholder = 'Vui long nhap ly do tu choi!';
            input.focus();
        }
        return;
    }

    box.style.display = 'block';
    box.style.animation = 'slideDown 0.3s ease';
    document.getElementById('action-buttons').style.display = 'none';
    input.focus();
}

function hideRejectReason() {
    document.getElementById('reject-reason-box').style.display = 'none';
    document.getElementById('reject-reason-input').value = '';
    document.getElementById('reject-reason-input').style.borderColor = '#fecaca';
    document.getElementById('reject-reason-input').placeholder = 'Nhập lý do từ chối giải pháp...';
    document.getElementById('action-buttons').style.display = 'flex';
}

function confirmReject() {
    var box = document.getElementById('reject-reason-box');
    var input = document.getElementById('reject-reason-input');

    if (!input.value.trim()) {
        box.style.animation = 'none';
        box.offsetHeight;
        box.style.animation = 'shake 0.4s ease';
        input.style.borderColor = '#dc2626';
        input.placeholder = 'Vui long nhap ly do tu choi!';
        input.focus();
        return;
    }

    if (activeRow) {
        changeRowStatus(activeRow, 'rejected', input.value.trim());
    }
    closeIncidentModal();
}

function showApproveDirective() {
    hideRejectReason();
    var box = document.getElementById('approve-directive-box');
    var input = document.getElementById('approve-directive-input');

    if (box.style.display === 'block') {
        if (!input.value.trim()) {
            box.style.animation = 'none';
            box.offsetHeight;
            box.style.animation = 'shake 0.4s ease';
            input.style.borderColor = '#16a34a';
            input.placeholder = 'Vui long nhap chi dao xu ly!';
            input.focus();
        }
        return;
    }

    box.style.display = 'block';
    box.style.animation = 'slideDown 0.3s ease';
    document.getElementById('action-buttons').style.display = 'none';
    input.focus();
}

function hideApproveDirective() {
    document.getElementById('approve-directive-box').style.display = 'none';
    document.getElementById('approve-directive-input').value = '';
    document.getElementById('approve-directive-input').style.borderColor = '#bbf7d0';
    document.getElementById('approve-directive-input').placeholder = 'Nhập chỉ đạo cụ thể cho điều phối viên...';
    document.getElementById('action-buttons').style.display = 'flex';
}

function confirmApprove() {
    var box = document.getElementById('approve-directive-box');
    var input = document.getElementById('approve-directive-input');

    if (!input.value.trim()) {
        box.style.animation = 'none';
        box.offsetHeight;
        box.style.animation = 'shake 0.4s ease';
        input.style.borderColor = '#16a34a';
        input.placeholder = 'Vui long nhap chi dao xu ly!';
        input.focus();
        return;
    }

    if (activeRow) {
        changeRowStatus(activeRow, 'approved', null, input.value.trim());
    }
    closeIncidentModal();
}

function changeRowStatus(row, status, reason, directive) {
    row.setAttribute('data-status', status);

    var statusBadge = row.querySelectorAll('.badge')[1];
    var actionCell = row.querySelector('.text-right');
    var tripId = row.querySelector('td').textContent;

    if (status === 'approved') {
        statusBadge.className = 'badge badge-success';
        statusBadge.textContent = 'Đã phê duyệt';
        row.setAttribute('data-directive', directive || '');
        actionCell.innerHTML = '<button onclick="openIncidentModal(this)" class="btn btn-outline" style="padding: 6px 12px;">Xem chi tiết</button>';
        showToast('Đã phê duyệt sự cố ' + tripId, 'success');
    } else if (status === 'rejected') {
        statusBadge.className = 'badge badge-danger';
        statusBadge.textContent = 'Từ chối';
        row.setAttribute('data-reason', reason || '');
        actionCell.innerHTML = '<button onclick="openIncidentModal(this)" class="btn btn-outline" style="padding: 6px 12px;">Xem chi tiết</button>';
        showToast('Đã từ chối sự cố ' + tripId, 'error');
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
        info.textContent = 'Không có sự cố nào';
    } else {
        info.textContent = 'Hiển thị ' + (start + 1) + '-' + Math.min(end, totalRows) + ' của ' + totalRows + ' sự cố';
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
    var tripId = row.querySelector('td').textContent;

    document.getElementById('reject-modal-order-id').textContent = tripId;
    document.getElementById('reject-modal-reason').textContent = reason;
    document.getElementById('rejectReasonModal').style.display = 'flex';
}

function closeRejectReasonModal() {
    document.getElementById('rejectReasonModal').style.display = 'none';
}

function viewDirective(btn) {
    var row = btn.closest('tr');
    var directive = row.getAttribute('data-directive');
    var tripId = row.querySelector('td').textContent;

    document.getElementById('directive-modal-order-id').textContent = tripId;
    document.getElementById('directive-modal-content').textContent = directive;
    document.getElementById('directiveModal').style.display = 'flex';
}

function closeDirectiveModal() {
    document.getElementById('directiveModal').style.display = 'none';
}

function openImageViewer(src, caption) {
    document.getElementById('imageViewerImg').src = src;
    document.getElementById('imageViewerCaption').textContent = caption;
    document.getElementById('imageViewerModal').style.display = 'flex';
}

function closeImageViewer() {
    document.getElementById('imageViewerModal').style.display = 'none';
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
