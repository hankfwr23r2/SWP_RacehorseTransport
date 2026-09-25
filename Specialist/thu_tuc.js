// ===== Quy tắc =====
// Áp dụng cho đơn ĐÃ THANH TOÁN. D = ngày khởi hành.
// - Giấy tờ của khách (đã xác minh bản scan lúc thẩm định): khách gửi BẢN GỐC cho kiểm dịch viên
//   trước 17:00 ngày D−3. Kiểm dịch viên đối chiếu bản gốc với bản scan rồi xác nhận "Đã nhận bản gốc".
// - Giấy tờ do cơ quan chức năng cấp: kiểm dịch viên đi làm thủ tục BÊN NGOÀI hệ thống. Khi đã cầm bản gốc,
//   cập nhật lên hệ thống: số giấy, cơ quan cấp, ngày cấp, hiệu lực đến (nếu giấy có thời hạn) và bản scan.
//     + Nội địa: Giấy chứng nhận kiểm dịch động vật vận chuyển ra khỏi tỉnh
//     + Xuyên biên giới: Giấy chứng nhận kiểm dịch động vật xuất/nhập khẩu + Tờ khai hải quan (điện tử, theo đơn)
//   Giấy có thời hạn phải còn hiệu lực đến hết ngày giao dự kiến (D + số ngày đi đường).
// - Bàn giao cho Điều phối viên trước 12:00 ngày D−2, chỉ khi mọi giấy đã đủ và không giấy nào hết hiệu lực
//   trước ngày giao. Điều phối viên chia giấy theo xe cho tài xế.
// - Kiểm dịch viên KHÔNG từ chối đơn. Khách không gửi bản gốc, bản gốc không khớp, cơ quan không cấp giấy...
//   → "Báo cáo Manager"; Manager quyết định tiếp.
const ORIGINALS_DUE_DAYS = 3;
const ORIGINALS_DUE_HOUR = 17;
const HANDOVER_DUE_DAYS = 2;
const HANDOVER_DUE_HOUR = 12;

const ME = { id: 'KD-01', name: 'Phạm Văn Hưng' };

const DOC_LABEL = {
    passport: 'Hộ chiếu ngựa / Microchip',
    vaccine: 'Giấy chứng nhận tiêm phòng',
    lab: 'Kết quả xét nghiệm EIA & cúm ngựa',
    import_permit: 'Giấy phép nhập khẩu của nước đến',
    ownership: 'Giấy tờ chứng minh sở hữu'
};
const DOCS_DOMESTIC = ['passport', 'vaccine', 'ownership'];
const DOCS_CROSS_BORDER = ['passport', 'vaccine', 'lab', 'import_permit', 'ownership'];
const FILE_PREFIX = { passport: 'Ho_chieu', vaccine: 'Tiem_phong', lab: 'Xet_nghiem', import_permit: 'Giay_phep_NK', ownership: 'So_huu' };

// Giấy do cơ quan chức năng cấp (theo đơn)
const PROCEDURES = {
    quarantine_domestic: { label: 'Giấy chứng nhận kiểm dịch động vật vận chuyển ra khỏi tỉnh', numberLabel: 'Số giấy chứng nhận', agencyHint: 'Ví dụ: Chi cục Chăn nuôi và Thú y Hà Nội', hasValidity: true },
    quarantine_border: { label: 'Giấy chứng nhận kiểm dịch động vật xuất/nhập khẩu', numberLabel: 'Số giấy chứng nhận', agencyHint: 'Ví dụ: Cơ quan Thú y vùng VI', hasValidity: true },
    customs: { label: 'Tờ khai hải quan (điện tử)', numberLabel: 'Số tờ khai', agencyHint: 'Ví dụ: Chi cục Hải quan cửa khẩu Mộc Bài', hasValidity: false }
};
const proceduresFor = order => order.border ? ['quarantine_border', 'customs'] : ['quarantine_domestic'];

const REPORT_TYPES = [
    'Khách chưa gửi bản gốc đúng hạn',
    'Bản gốc không khớp bản scan đã xác minh',
    'Cơ quan chức năng không cấp hoặc chậm cấp giấy',
    'Giấy được cấp hết hiệu lực trước ngày giao',
    'Khác'
];

// ===== Thời gian =====
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const pad = n => String(n).padStart(2, '0');
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const formatDate = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const formatTime = t => { const d = new Date(t); return `${formatDate(t)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const formatDeadline = t => `${WEEKDAYS[new Date(t).getDay()]} ${formatTime(t)}`;
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

function atHour(t, hour) {
    const d = new Date(t);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
}

const today = atHour(Date.now(), 0);
const daysFromToday = (k, hour = 0) => atHour(today + k * DAY, hour);

// ===== Dữ liệu mẫu (mốc thời gian tương đối so với hôm nay) =====
// received: các giấy đã nhận bản gốc; procedures: giấy cơ quan đã cấp { number, agency, issuedAt, validUntil, file }
function makeOrder(o) {
    const keys = o.border ? DOCS_CROSS_BORDER : DOCS_DOMESTIC;
    o.horses.forEach(h => {
        const slug = h.name.replace(/\s+/g, '_');
        h.docs = {};
        keys.forEach(key => {
            h.docs[key] = { file: `${FILE_PREFIX[key]}_${slug}.pdf`, receivedAt: (h.received === 'all' || (h.received || []).includes(key)) ? o.paidAt + DAY : null };
        });
        delete h.received;
    });
    o.procedures = o.procedures || {};
    return o;
}

const orders = [
    makeOrder({
        id: 'EQ-2026-1058', customer: 'Trang trại Tây Ninh Stud', paidAt: daysFromToday(-4, 10), departure: daysFromToday(6), tripDays: 1,
        from: 'Trang trại Tây Ninh Stud (Tây Ninh, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Tây Ninh → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', coordinator: 'Phạm Tâm',
        horses: [
            { name: 'Bà Đen', breed: 'Thoroughbred', sex: 'Cái', chip: 'VN-610118', received: 'all' },
            { name: 'Vàm Cỏ', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-610125', received: ['passport', 'vaccine'] }
        ],
        procedures: {
            quarantine_border: { number: 'KD-XK-2026/0412', agency: 'Cơ quan Thú y vùng VI', issuedAt: daysFromToday(-1), validUntil: daysFromToday(12), file: 'GCN_kiem_dich_XK_EQ-2026-1058.pdf' }
        },
        status: 'preparing'
    }),
    makeOrder({
        id: 'EQ-2026-1060', customer: 'Trang trại Ba Vì', paidAt: daysFromToday(-2, 15), departure: daysFromToday(5), tripDays: 1,
        from: 'Trang trại Ba Vì (Hà Nội, VN)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Ba Vì → Đà Nẵng', border: null, coordinator: 'Trần Minh',
        horses: [
            { name: 'Tản Viên', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-330145', received: 'all' }
        ],
        status: 'preparing'
    }),
    makeOrder({
        id: 'EQ-2026-1057', customer: 'Savan Horse Club', paidAt: daysFromToday(-5, 9), departure: daysFromToday(7), tripDays: 2,
        from: 'Trường đua Savannakhet (Savannakhet, LA)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Savannakhet (LA) → Đà Nẵng', border: 'Densavanh – Lao Bảo', coordinator: 'Phạm Tâm',
        horses: [
            { name: 'Mekong Wind', breed: 'Arabian', sex: 'Cái', chip: 'LA-118903', received: 'all' }
        ],
        procedures: {
            quarantine_border: { number: 'KD-NK-2026/0388', agency: 'Cơ quan Thú y vùng III', issuedAt: daysFromToday(-1), validUntil: daysFromToday(8), file: 'GCN_kiem_dich_NK_EQ-2026-1057.pdf' },
            customs: { number: '305112448720', agency: 'Chi cục Hải quan cửa khẩu Lao Bảo', issuedAt: daysFromToday(-1), validUntil: null, file: 'To_khai_HQ_EQ-2026-1057.pdf' }
        },
        status: 'preparing'
    }),
    makeOrder({
        id: 'EQ-2026-1055', customer: 'CLB Ngựa Phú Thọ', paidAt: daysFromToday(-6, 11), departure: daysFromToday(4), tripDays: 1,
        from: 'Trường đua Phú Thọ (TP.HCM, VN)', to: 'Trường đua Angkor (Siem Reap, KH)',
        routeShort: 'TP.HCM → Siem Reap (KH)', border: 'Mộc Bài – Bavet', coordinator: 'Trần Minh',
        horses: [
            { name: 'Xích Thố', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-503311', received: 'all' }
        ],
        procedures: {
            quarantine_border: { number: 'KD-XK-2026/0405', agency: 'Cơ quan Thú y vùng VI', issuedAt: daysFromToday(-2), validUntil: daysFromToday(10), file: 'GCN_kiem_dich_XK_EQ-2026-1055.pdf' },
            customs: { number: '305112431150', agency: 'Chi cục Hải quan cửa khẩu Mộc Bài', issuedAt: daysFromToday(-1), validUntil: null, file: 'To_khai_HQ_EQ-2026-1055.pdf' }
        },
        status: 'preparing'
    }),
    makeOrder({
        id: 'EQ-2026-1054', customer: 'Đại Nam Racing', paidAt: daysFromToday(-7, 9), departure: daysFromToday(1), tripDays: 1,
        from: 'Trường đua Đại Nam (Bình Dương, VN)', to: 'Trang trại Mekong (Cần Thơ, VN)',
        routeShort: 'Bình Dương → Cần Thơ', border: null, coordinator: 'Trần Minh',
        horses: [
            { name: 'Hỏa Tiễn', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-420017', received: 'all' }
        ],
        status: 'preparing'
    }),
    makeOrder({
        id: 'EQ-2026-1050', customer: 'Hoàng Gia Stud', paidAt: daysFromToday(-9, 14), departure: daysFromToday(1), tripDays: 2,
        from: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)', to: 'Trường đua Luang Prabang (Luang Prabang, LA)',
        routeShort: 'Hà Nội → Luang Prabang (LA)', border: 'Tây Trang – Sop Hun', coordinator: 'Phạm Tâm',
        horses: [
            { name: 'Ngọc Hoàng', breed: 'Arabian', sex: 'Đực', chip: 'VN-902214', received: 'all' }
        ],
        procedures: {
            quarantine_border: { number: 'KD-XK-2026/0397', agency: 'Cơ quan Thú y vùng I', issuedAt: daysFromToday(-3), validUntil: daysFromToday(9), file: 'GCN_kiem_dich_XK_EQ-2026-1050.pdf' },
            customs: { number: '305112402267', agency: 'Chi cục Hải quan cửa khẩu Tây Trang', issuedAt: daysFromToday(-2), validUntil: null, file: 'To_khai_HQ_EQ-2026-1050.pdf' }
        },
        status: 'handed', handedAt: daysFromToday(-1, 10)
    }),
    makeOrder({
        id: 'EQ-2026-1052', customer: 'Trang trại Long Thành', paidAt: daysFromToday(-8, 16), departure: daysFromToday(3), tripDays: 2,
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Angkor (Siem Reap, KH)',
        routeShort: 'Đồng Nai → Siem Reap (KH)', border: 'Mộc Bài – Bavet', coordinator: 'Trần Minh',
        horses: [
            { name: 'Kim Lân', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-215530', received: ['passport', 'vaccine', 'lab'] }
        ],
        procedures: {
            quarantine_border: { number: 'KD-XK-2026/0409', agency: 'Cơ quan Thú y vùng VI', issuedAt: daysFromToday(-1), validUntil: daysFromToday(11), file: 'GCN_kiem_dich_XK_EQ-2026-1052.pdf' }
        },
        status: 'reported', reportedAt: daysFromToday(0, 8),
        report: {
            type: 'Khách chưa gửi bản gốc đúng hạn',
            items: ['Kim Lân · Giấy phép nhập khẩu của nước đến', 'Kim Lân · Giấy tờ chứng minh sở hữu', 'Tờ khai hải quan (điện tử)'],
            note: 'Đã gọi khách 2 lần, khách hẹn gửi nhưng chưa nhận được. Chưa khai hải quan được vì thiếu bản gốc giấy phép nhập khẩu.'
        }
    })
];

// ===== Tính toán =====
const customerDocs = order => order.border ? DOCS_CROSS_BORDER : DOCS_DOMESTIC;
const originalsDue = order => atHour(order.departure - ORIGINALS_DUE_DAYS * DAY, ORIGINALS_DUE_HOUR);
const handoverDue = order => atHour(order.departure - HANDOVER_DUE_DAYS * DAY, HANDOVER_DUE_HOUR);
const deliveryDate = order => order.departure + order.tripDays * DAY;

// Giấy có thời hạn phải còn hiệu lực đến hết ngày giao dự kiến
const expiresEarly = (order, key) => {
    const p = order.procedures[key];
    return !!(p && PROCEDURES[key].hasValidity && dayKey(p.validUntil) < dayKey(deliveryDate(order)));
};

// Mọi việc của một đơn: bản gốc của từng ngựa + giấy cơ quan cấp
function itemsOf(order) {
    const originals = order.horses.flatMap((h, hIndex) => customerDocs(order).map(key => ({
        kind: 'original', hIndex, key, label: `${h.name} · ${DOC_LABEL[key]}`, done: !!h.docs[key].receivedAt
    })));
    const procedures = proceduresFor(order).map(key => ({
        kind: 'procedure', key, label: PROCEDURES[key].label, done: !!order.procedures[key] && !expiresEarly(order, key)
    }));
    return [...procedures, ...originals];
}

function progressOf(order) {
    const items = itemsOf(order);
    const done = items.filter(i => i.done).length;
    return { total: items.length, done, ready: done === items.length };
}

const isReady = order => order.status === 'preparing' && progressOf(order).ready;

function dueBadge(order) {
    if (order.status === 'handed') return `<span class="kd-muted">Bàn giao lúc ${formatTime(order.handedAt)}</span>`;
    if (order.status === 'reported') return `<span class="kd-muted">Báo cáo lúc ${formatTime(order.reportedAt)}</span>`;
    const due = handoverDue(order);
    if (Date.now() > due) return '<span class="status-badge status-red">Quá hạn bàn giao</span>';
    const hoursLeft = (due - Date.now()) / HOUR;
    const cls = hoursLeft <= 24 ? 'status-red' : hoursLeft <= 48 ? 'status-orange' : 'status-green';
    return `<span class="status-badge ${cls}">${formatDeadline(due)}</span>`;
}

function statusBadge(order) {
    switch (order.status) {
        case 'preparing': {
            if (isReady(order)) return '<span class="status-badge status-green"><i class="fa-solid fa-circle-check"></i> Sẵn sàng bàn giao</span>';
            const p = progressOf(order);
            const warn = proceduresFor(order).some(key => expiresEarly(order, key));
            return `<span class="status-badge ${warn ? 'status-red' : 'status-blue'}">${warn ? '<i class="fa-solid fa-triangle-exclamation"></i> ' : ''}Đủ ${p.done}/${p.total} giấy</span>`;
        }
        case 'handed': return `<span class="status-badge status-gray"><i class="fa-solid fa-handshake"></i> Đã bàn giao ${order.coordinator}</span>`;
        case 'reported': return '<span class="status-badge status-orange">Đã báo cáo Manager</span>';
    }
}

// ===== Danh sách =====
const TABS = [
    ['preparing', 'Đang chuẩn bị', o => o.status === 'preparing' && !isReady(o)],
    ['ready', 'Sẵn sàng bàn giao', isReady],
    ['handed', 'Đã bàn giao Điều phối', o => o.status === 'handed'],
    ['reported', 'Đã báo cáo Manager', o => o.status === 'reported']
];
let currentTab = 'preparing';

function renderList() {
    document.getElementById('me-name').textContent = `${ME.name} · ${ME.id}`;

    const active = orders.filter(o => o.status === 'preparing');
    const stats = [
        ['Đang chuẩn bị', active.filter(o => !isReady(o)).length, 'fa-regular fa-clock icon-orange', 'line-orange'],
        ['Hạn bàn giao ≤ 24 giờ', active.filter(o => handoverDue(o) - Date.now() <= 24 * HOUR).length, 'fa-solid fa-triangle-exclamation icon-yellow', 'line-yellow'],
        ['Sẵn sàng bàn giao', active.filter(isReady).length, 'fa-solid fa-box-archive icon-gray', 'line-blue'],
        ['Đã bàn giao', orders.filter(o => o.status === 'handed').length, 'fa-regular fa-circle-check icon-green', 'line-green']
    ];
    document.getElementById('tt-stats').innerHTML = stats.map(([label, value, icon, line]) => `
        <div class="stat-card">
            <div class="stat-header"><span>${label}</span><i class="${icon}"></i></div>
            <div class="stat-value">${value} <span class="stat-unit">đơn</span></div>
            <div class="stat-line ${line}"></div>
        </div>`).join('');

    document.getElementById('tt-tabs').innerHTML = TABS.map(([key, label, match]) =>
        `<button class="kd-tab ${key === currentTab ? 'active' : ''}" onclick="switchTab('${key}')">${label} (${orders.filter(match).length})</button>`
    ).join('');

    const match = TABS.find(t => t[0] === currentTab)[2];
    const list = orders.filter(match).sort((a, b) => a.departure - b.departure);
    document.getElementById('tt-list').innerHTML = list.length
        ? list.map(order => `
            <tr>
                <td class="bold">${order.id}</td>
                <td class="bold">${order.customer}</td>
                <td>${order.routeShort}${order.border ? `<div class="kd-muted"><i class="fa-solid fa-flag"></i> ${order.border}</div>` : ''}</td>
                <td><span class="bold">${order.horses.length}</span> ngựa</td>
                <td>${formatDate(order.departure)}</td>
                <td>${dueBadge(order)}</td>
                <td>${statusBadge(order)}</td>
                <td><button class="kd-btn ${order.status === 'preparing' ? 'kd-btn-primary' : 'kd-btn-light'}" onclick="showDetail('${order.id}')">${order.status === 'preparing' ? 'Xử lý' : 'Xem'}</button></td>
            </tr>`).join('')
        : '<tr><td colspan="8" class="kd-empty">Không có đơn nào</td></tr>';
}

function switchTab(key) {
    currentTab = key;
    renderList();
}

function showList() {
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('list-view').style.display = 'block';
    renderList();
    window.scrollTo(0, 0);
}

// ===== Chi tiết =====
let order = null;

function infoRow(label, value) {
    return `<div class="kd-info-row"><span>${label}</span><span>${value}</span></div>`;
}

function showDetail(orderId) {
    order = orders.find(o => o.id === orderId);
    document.getElementById('list-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    renderDetail();
    window.scrollTo(0, 0);
}

function renderDetail() {
    const editable = order.status === 'preparing';
    document.getElementById('d-crumb').textContent = order.id;
    document.getElementById('d-title').textContent = `Giấy tờ chuyến đi ${order.id}`;
    document.getElementById('d-badge').innerHTML = statusBadge(order);

    const missingOriginals = itemsOf(order).filter(i => i.kind === 'original' && !i.done).length;
    let banner;
    if (order.status === 'handed') {
        banner = ['kd-alert-success', 'fa-handshake', `Đã bàn giao bộ bản gốc cho Điều phối viên <strong>${order.coordinator}</strong> lúc <strong>${formatTime(order.handedAt)}</strong>. Điều phối viên chia giấy tờ theo xe cho tài xế.`];
    } else if (order.status === 'reported') {
        const r = order.report;
        banner = ['kd-alert-warning', 'fa-user-tie', `Đã báo cáo Manager lúc <strong>${formatTime(order.reportedAt)}</strong> — ${r.type}.<br>Giấy liên quan: ${r.items.join('; ')}.<br>Ghi chú: ${r.note}<br>Manager sẽ quyết định cách xử lý. Bạn tiếp tục khi Manager giao lại.`];
    } else if (Date.now() > handoverDue(order)) {
        banner = ['kd-alert-danger', 'fa-triangle-exclamation', `Đã quá hạn bàn giao (<strong>${formatDeadline(handoverDue(order))}</strong>). Nếu không kịp hoàn tất trước ngày khởi hành, hãy <strong>Báo cáo Manager</strong> ngay.`];
    } else if (Date.now() > originalsDue(order) && missingOriginals) {
        banner = ['kd-alert-warning', 'fa-clock', `Khách đã quá hạn gửi bản gốc (<strong>${formatDeadline(originalsDue(order))}</strong>), còn thiếu ${missingOriginals} giấy. Liên hệ khách; nếu không kịp, hãy <strong>Báo cáo Manager</strong>.`];
    } else {
        banner = ['kd-alert-info', 'fa-circle-info', `Khách gửi bản gốc trước <strong>${formatDeadline(originalsDue(order))}</strong>. Bàn giao bộ giấy tờ cho Điều phối viên trước <strong>${formatDeadline(handoverDue(order))}</strong>.`];
    }
    document.getElementById('d-banner').innerHTML = `<div class="kd-alert ${banner[0]}"><i class="fa-solid ${banner[1]}"></i><div>${banner[2]}</div></div>`;

    document.getElementById('d-procedures').innerHTML = proceduresFor(order).map(key => procedureRow(key, editable)).join('');

    const originals = itemsOf(order).filter(i => i.kind === 'original');
    document.getElementById('d-originals-progress').textContent = `Đã nhận ${originals.filter(i => i.done).length}/${originals.length} bản gốc`;
    document.getElementById('d-originals').innerHTML = order.horses.map((h, hIndex) => `
        <div class="kd-horse-info">${h.name} · ${h.breed} · ${h.sex} · Microchip <strong>${h.chip}</strong></div>
        <table class="kd-table tt-table">
            <tbody>${customerDocs(order).map(key => originalRow(hIndex, key, editable)).join('')}</tbody>
        </table>`).join('');

    document.getElementById('d-side').innerHTML = sidePanel(editable);
}

function procedureRow(key, editable) {
    const def = PROCEDURES[key];
    const p = order.procedures[key];
    const early = expiresEarly(order, key);
    const state = !p ? '<span class="status-badge status-gray">Chưa có</span>'
        : early ? '<span class="status-badge status-red">Hết hiệu lực trước ngày giao</span>'
        : '<span class="status-badge status-green">Đã có bản gốc</span>';
    const details = p ? `
        <div class="tt-fields">
            <div><span class="kd-muted">${def.numberLabel}</span><strong>${p.number}</strong></div>
            <div><span class="kd-muted">Cơ quan cấp</span>${p.agency}</div>
            <div><span class="kd-muted">Ngày cấp</span>${formatDate(p.issuedAt)}</div>
            ${def.hasValidity ? `<div><span class="kd-muted">Hiệu lực đến</span><span class="${early ? 'kd-red' : ''}">${formatDate(p.validUntil)}</span></div>` : ''}
        </div>
        ${early ? `<p class="kd-hint kd-red"><i class="fa-solid fa-triangle-exclamation"></i> Ngày giao dự kiến là ${formatDate(deliveryDate(order))}. Xin cấp lại giấy còn hiệu lực đến hết ngày này, hoặc báo cáo Manager.</p>` : ''}` : '';
    return `
        <div class="kd-doc ${p && !early ? 'kd-doc-valid' : early ? 'kd-doc-invalid' : ''}">
            <div class="kd-doc-head">
                <div class="kd-doc-name">${def.label}</div>
                <div class="tt-actions">
                    ${state}
                    ${p ? `<button class="kd-btn kd-btn-light kd-btn-sm" onclick="previewFile('${p.file}')"><i class="fa-solid fa-file-pdf"></i> Bản scan</button>` : ''}
                    ${editable ? `<button class="kd-btn ${p ? 'kd-btn-light' : 'kd-btn-primary'} kd-btn-sm" onclick="openProcedure('${key}')">${p ? 'Cập nhật lại' : 'Cập nhật giấy đã cấp'}</button>` : ''}
                </div>
            </div>
            ${details}
        </div>`;
}

function originalRow(hIndex, key, editable) {
    const doc = order.horses[hIndex].docs[key];
    const state = doc.receivedAt
        ? `<span class="status-badge status-green">Đã nhận bản gốc</span><div class="kd-muted">${formatTime(doc.receivedAt)}</div>`
        : '<span class="status-badge status-gray">Chưa nhận</span>';
    const action = !editable ? ''
        : doc.receivedAt ? `<button class="kd-btn kd-btn-light kd-btn-sm" onclick="undoOriginal(${hIndex}, '${key}')">Hoàn tác</button>`
        : `<button class="kd-btn kd-btn-primary kd-btn-sm" onclick="openOriginal(${hIndex}, '${key}')">Xác nhận đã nhận</button>`;
    return `
        <tr>
            <td>${DOC_LABEL[key]}</td>
            <td><button class="kd-btn kd-btn-light kd-btn-sm" onclick="previewFile('${doc.file}')"><i class="fa-solid fa-file-pdf"></i> Bản scan</button></td>
            <td>${state}</td>
            <td class="tt-right">${action}</td>
        </tr>`;
}

function sidePanel(editable) {
    const info = `
        <div class="kd-card">
            <div class="kd-card-header"><h3><i class="fa-solid fa-file-lines"></i> Thông tin đơn</h3></div>
            <div class="kd-card-body">
                ${infoRow('Khách hàng', order.customer)}
                ${infoRow('Điểm đi', order.from)}
                ${infoRow('Điểm đến', order.to)}
                ${infoRow('Loại tuyến', order.border ? `Xuyên quốc gia · ${order.border}` : 'Nội địa')}
                ${infoRow('Khởi hành', `<strong>${formatDate(order.departure)}</strong>`)}
                ${infoRow('Giao dự kiến', formatDate(deliveryDate(order)))}
                ${infoRow('Điều phối viên', order.coordinator)}
                ${infoRow('Thanh toán lúc', formatTime(order.paidAt))}
            </div>
        </div>`;
    if (!editable) return info;

    const p = progressOf(order);
    const overdue = Date.now() > handoverDue(order);
    return `
        <div class="kd-card">
            <div class="kd-card-header"><h3><i class="fa-solid fa-box-archive"></i> Bàn giao</h3></div>
            <div class="kd-card-body">
                <div class="kd-deadline ${overdue || handoverDue(order) - Date.now() <= 24 * HOUR ? 'urgent' : ''}">
                    <div><i class="fa-regular fa-clock"></i> Hạn bàn giao: <strong>${formatDeadline(handoverDue(order))}</strong></div>
                    <div class="kd-muted">Khách gửi bản gốc trước ${formatDeadline(originalsDue(order))}</div>
                </div>
                <div class="kd-progress"><div style="width: ${Math.round(p.done / p.total * 100)}%"></div></div>
                <div class="kd-muted" style="margin-bottom: 12px;">Đủ ${p.done}/${p.total} giấy</div>

                <button class="kd-btn kd-btn-primary kd-btn-full" ${p.ready ? '' : 'disabled'} onclick="openHandover()"><i class="fa-solid fa-handshake"></i> Bàn giao cho Điều phối viên</button>
                <p class="kd-hint">${p.ready ? `Giao bộ bản gốc cho ${order.coordinator}.` : `Cần đủ ${p.total} giấy và không giấy nào hết hiệu lực trước ngày giao.`}</p>
                <button class="kd-btn kd-btn-danger-outline kd-btn-full" ${p.ready ? 'disabled' : ''} onclick="openReport()"><i class="fa-solid fa-flag"></i> Báo cáo Manager</button>
                <p class="kd-hint">${p.ready ? 'Đã đủ giấy tờ, không cần báo cáo.' : 'Khi khách không gửi bản gốc, bản gốc không khớp, hoặc cơ quan không cấp giấy. Bạn không từ chối đơn.'}</p>
            </div>
        </div>
        ${info}`;
}

// ===== Modal =====
document.addEventListener('input', e => e.target.classList.remove('kd-input-error'));
document.addEventListener('change', e => e.target.classList.remove('kd-input-error'));

function openModal(title, body, actions) {
    document.getElementById('m-title').innerHTML = title;
    document.getElementById('m-body').innerHTML = body;
    document.getElementById('m-actions').innerHTML = `<button class="kd-btn kd-btn-light" onclick="closeModal()">Hủy</button>${actions}`;
    document.getElementById('kd-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('kd-modal').style.display = 'none';
}

function previewFile(file) {
    openModal('Bản scan', `<div class="kd-preview"><i class="fa-solid fa-file-pdf"></i><div>${file}</div><div class="kd-muted">Bản xem trước tài liệu</div></div>`, '');
    document.getElementById('m-actions').innerHTML = '<button class="kd-btn kd-btn-light" onclick="closeModal()">Đóng</button>';
}

function markError(el) {
    el.classList.add('kd-input-error');
    el.focus();
    return false;
}

// Nhận bản gốc của khách: phải đối chiếu với bản scan đã xác minh
function openOriginal(hIndex, key) {
    const horse = order.horses[hIndex];
    openModal(`Nhận bản gốc · ${horse.name}`, `
        <p class="kd-lead"><strong>${DOC_LABEL[key]}</strong> của ngựa ${horse.name} (microchip ${horse.chip}).</p>
        <label id="m-match-box" class="kd-evidence-item" style="padding-left: 0;"><input type="checkbox" id="m-match"> Tôi đã đối chiếu: bản gốc khớp với bản scan đã xác minh (cùng microchip, dấu, chữ ký, ngày cấp)</label>
        <p class="kd-hint"><i class="fa-solid fa-circle-info"></i> Nếu bản gốc không khớp bản scan, không xác nhận. Hãy dùng "Báo cáo Manager".</p>`,
        `<button class="kd-btn kd-btn-primary" onclick="confirmOriginal(${hIndex}, '${key}')"><i class="fa-solid fa-check"></i> Xác nhận đã nhận</button>`);
}

function confirmOriginal(hIndex, key) {
    if (!document.getElementById('m-match').checked) {
        document.getElementById('m-match-box').classList.add('kd-input-error');
        return;
    }
    order.horses[hIndex].docs[key].receivedAt = Date.now();
    closeModal();
    showToast(`Đã nhận bản gốc ${DOC_LABEL[key]} của ${order.horses[hIndex].name}`);
    renderDetail();
}

function undoOriginal(hIndex, key) {
    order.horses[hIndex].docs[key].receivedAt = null;
    renderDetail();
}

// Cập nhật giấy cơ quan chức năng đã cấp
function openProcedure(key) {
    const def = PROCEDURES[key];
    const p = order.procedures[key] || {};
    const toInput = t => t ? dayKey(t) : '';
    openModal(def.label, `
        <label class="kd-label">${def.numberLabel} <span class="kd-red">*</span></label>
        <input id="m-number" class="kd-input" value="${p.number || ''}">
        <label class="kd-label">Cơ quan cấp <span class="kd-red">*</span></label>
        <input id="m-agency" class="kd-input" value="${p.agency || ''}" placeholder="${def.agencyHint}">
        <div class="tt-form-row">
            <div><label class="kd-label">Ngày cấp <span class="kd-red">*</span></label><input id="m-issued" type="date" class="kd-input" max="${dayKey(Date.now())}" value="${toInput(p.issuedAt)}"></div>
            ${def.hasValidity ? `<div><label class="kd-label">Hiệu lực đến <span class="kd-red">*</span></label><input id="m-valid" type="date" class="kd-input" value="${toInput(p.validUntil)}"></div>` : ''}
        </div>
        ${def.hasValidity ? `<p class="kd-hint">Phải còn hiệu lực đến hết ngày giao dự kiến <strong>${formatDate(deliveryDate(order))}</strong>.</p>` : ''}
        <label class="kd-label">Bản scan giấy đã cấp <span class="kd-red">*</span></label>
        ${p.file ? `<p class="kd-hint" style="margin-top: 0;">Đang có: ${p.file}. Chọn tệp mới nếu muốn thay.</p>` : ''}
        <input id="m-file" type="file" class="kd-input" accept=".pdf,.jpg,.jpeg,.png">
        <p class="kd-hint"><i class="fa-solid fa-eye"></i> Manager và khách hàng xem được bản scan này.</p>`,
        `<button class="kd-btn kd-btn-primary" onclick="saveProcedure('${key}')"><i class="fa-solid fa-floppy-disk"></i> Lưu</button>`);
}

function saveProcedure(key) {
    const def = PROCEDURES[key];
    const old = order.procedures[key];
    const number = document.getElementById('m-number');
    const agency = document.getElementById('m-agency');
    const issued = document.getElementById('m-issued');
    const valid = document.getElementById('m-valid');
    const file = document.getElementById('m-file');
    if (!number.value.trim()) return markError(number);
    if (!agency.value.trim()) return markError(agency);
    if (!issued.value || issued.value > dayKey(Date.now())) return markError(issued);
    if (def.hasValidity && (!valid.value || valid.value < issued.value)) {
        showToast('Hiệu lực đến phải từ ngày cấp trở đi', 'error');
        return markError(valid);
    }
    if (!file.files.length && !old) return markError(file);
    const toTime = value => new Date(`${value}T00:00:00`).getTime();
    order.procedures[key] = {
        number: number.value.trim(), agency: agency.value.trim(), issuedAt: toTime(issued.value),
        validUntil: def.hasValidity ? toTime(valid.value) : null,
        file: file.files.length ? file.files[0].name : old.file
    };
    closeModal();
    if (expiresEarly(order, key)) showToast('Đã lưu, nhưng giấy hết hiệu lực trước ngày giao dự kiến', 'error');
    else showToast(`Đã cập nhật ${def.label}`);
    renderDetail();
}

function openHandover() {
    const total = progressOf(order).total;
    openModal(`Bàn giao giấy tờ ${order.id}`, `
        <p class="kd-lead">Bộ bản gốc gồm ${total} giấy:</p>
        <table class="kd-table">
            <thead><tr><th>Giấy tờ</th><th>Ghi chú</th></tr></thead>
            <tbody>
                ${proceduresFor(order).map(key => `<tr><td>${PROCEDURES[key].label}</td><td>${PROCEDURES[key].numberLabel} ${order.procedures[key].number}</td></tr>`).join('')}
                ${order.horses.map(h => `<tr><td>Giấy tờ của ${h.name}</td><td>${customerDocs(order).length} giấy · microchip ${h.chip}</td></tr>`).join('')}
            </tbody>
        </table>
        <label id="m-handover-box" class="kd-evidence-item" style="padding-left: 0;"><input type="checkbox" id="m-handover"> Tôi đã giao đủ ${total} bản gốc cho Điều phối viên <strong>${order.coordinator}</strong>, hai bên đã kiểm đếm</label>
        <p class="kd-hint"><i class="fa-solid fa-circle-info"></i> Điều phối viên sẽ chia giấy tờ theo xe: mỗi tài xế nhận giấy của các con ngựa trên xe mình${order.border ? ' và bản in tờ khai hải quan' : ''}.</p>`,
        '<button class="kd-btn kd-btn-primary" onclick="confirmHandover()"><i class="fa-solid fa-handshake"></i> Xác nhận bàn giao</button>');
}

function confirmHandover() {
    if (!document.getElementById('m-handover').checked) {
        document.getElementById('m-handover-box').classList.add('kd-input-error');
        return;
    }
    order.status = 'handed';
    order.handedAt = Date.now();
    closeModal();
    showToast(`Đã bàn giao giấy tờ ${order.id} cho ${order.coordinator}`);
    renderDetail();
}

function openReport() {
    const pending = itemsOf(order).filter(i => !i.done);
    openModal(`Báo cáo Manager · ${order.id}`, `
        <label class="kd-label">Vấn đề <span class="kd-red">*</span></label>
        <select id="m-type" class="kd-input">${REPORT_TYPES.map(t => `<option>${t}</option>`).join('')}</select>
        <label class="kd-label">Giấy liên quan <span class="kd-red">*</span></label>
        <div id="m-items" class="kd-evidence">
            ${pending.map((item, i) => `<label class="kd-evidence-item"><input type="checkbox" class="m-item" value="${i}" checked onchange="document.getElementById('m-items').classList.remove('kd-input-error')"> ${item.label}</label>`).join('')}
        </div>
        <label class="kd-label">Ghi chú cho Manager <span class="kd-red">*</span></label>
        <textarea id="m-note" class="kd-input" rows="3" placeholder="Đã làm gì, còn vướng gì, dự kiến khi nào xong..."></textarea>`,
        '<button class="kd-btn kd-btn-danger" onclick="confirmReport()"><i class="fa-solid fa-flag"></i> Gửi báo cáo</button>');
}

function confirmReport() {
    const pending = itemsOf(order).filter(i => !i.done);
    const items = [...document.querySelectorAll('.m-item:checked')].map(cb => pending[Number(cb.value)].label);
    const note = document.getElementById('m-note');
    if (!items.length) {
        document.getElementById('m-items').classList.add('kd-input-error');
        return;
    }
    if (!note.value.trim()) return markError(note);
    order.status = 'reported';
    order.reportedAt = Date.now();
    order.report = { type: document.getElementById('m-type').value, items, note: note.value.trim() };
    closeModal();
    showToast(`Đã gửi báo cáo ${order.id} cho Manager`);
    renderDetail();
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `kd-toast ${type === 'error' ? 'kd-toast-error' : ''}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-check'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

renderList();
