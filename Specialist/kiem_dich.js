// ===== Quy tắc =====
// - Hạn xử lý = mốc SỚM HƠN của:
//     (1) 17:00 ngày làm việc thứ SLA_WORKING_DAYS, đếm từ ngày làm việc kế tiếp sau lúc được giao
//     (2) 17:00 của (ngày khởi hành − CAP_DAYS); rơi vào ngày nghỉ thì lùi về ngày làm việc trước đó
//   Đang chờ khách bổ sung thì đồng hồ tạm dừng. Quá hạn: hệ thống tự chuyển đơn cho kiểm dịch viên khác.
// - Kiểm dịch viên xác minh BẰNG TAY từng giấy tờ (mở file, đối chiếu theo danh sách điểm cần kiểm tra
//   của từng loại giấy). Hệ thống không tự đọc nội dung tài liệu.
// - Kiểm dịch viên KHÔNG từ chối đơn (quyết định từ chối thuộc về Manager). Kết luận có 3 loại:
//     + Hồ sơ hợp lệ: chỉ khi MỌI giấy tờ của MỌI ngựa đều Hợp lệ → chuyển Điều phối viên
//     + Yêu cầu khách bổ sung (lỗi khắc phục được): khi đã xác minh hết và có ít nhất 1 giấy Không hợp lệ;
//       có thể yêu cầu nộp BẢN GỐC để đối chiếu khi nghi giấy tờ không thật
//     + Báo cáo vấn đề không khắc phục được (dương tính bệnh, đã bổ sung vẫn không đạt...): chuyển Manager.
//       Bắt buộc: ngựa bị ảnh hưởng, loại vấn đề, bệnh có chữa được không (nếu dương tính), kết luận chuyên môn,
//       và ít nhất 1 giấy tờ Không hợp lệ làm căn cứ. Manager sẽ đưa phương án cho khách chọn.
// - Kiểm tra lại (khách chọn phương án D): kiểm dịch viên KHÁC xác minh lại từ đầu, độc lập.
const WORK_END_HOUR = 17;
const HOLIDAYS = ['2026-01-01', '2026-04-30', '2026-05-01', '2026-09-02', '2027-01-01'];
const SLA_WORKING_DAYS = 2;
const CAP_DAYS = 7;

const ME = { id: 'KD-01', name: 'Phạm Văn Hưng' };

const DOC_LABEL = {
    passport: 'Hộ chiếu ngựa / Microchip',
    vaccine: 'Giấy chứng nhận tiêm phòng',
    lab: 'Kết quả xét nghiệm EIA & cúm ngựa',
    import_permit: 'Giấy phép nhập khẩu của nước đến',
    ownership: 'Giấy tờ chứng minh sở hữu'
};
// Điểm cần đối chiếu khi xác minh bằng tay (hiển thị kèm thông tin khách đã khai)
function checklistFor(key, order, horse) {
    const departure = formatDate(order.departure);
    switch (key) {
        case 'passport': return [
            `Microchip trên hộ chiếu trùng microchip khách khai: <strong>${horse.chip}</strong>`,
            `Tên, giống, giới tính khớp: <strong>${horse.name} · ${horse.breed} · ${horse.sex}</strong>`,
            'Mục đích sử dụng: ngựa đua'
        ];
        case 'vaccine': return [
            'Đủ các mũi bắt buộc (cúm ngựa, uốn ván), có dấu và chữ ký thú y',
            `Còn hiệu lực đến sau ngày khởi hành <strong>${departure}</strong>`,
            `Microchip trên giấy trùng <strong>${horse.chip}</strong>`
        ];
        case 'lab': return [
            'Kết quả âm tính EIA và cúm ngựa, có dấu phòng xét nghiệm',
            `Còn hiệu lực đến sau ngày khởi hành <strong>${departure}</strong>`
        ];
        case 'import_permit': return [
            `Cấp cho đúng nước đến của tuyến <strong>${order.routeShort}</strong>`,
            `Ghi đúng ngựa (microchip <strong>${horse.chip}</strong>)`,
            `Còn hiệu lực đến sau ngày khởi hành <strong>${departure}</strong>`
        ];
        case 'ownership': return [
            `Chủ sở hữu trùng khách hàng <strong>${order.customer}</strong>, hoặc có giấy ủy quyền kèm theo`,
            `Ghi đúng ngựa (microchip <strong>${horse.chip}</strong>)`
        ];
    }
}

const DOCS_DOMESTIC = ['passport', 'vaccine', 'ownership'];
const DOCS_CROSS_BORDER = ['passport', 'vaccine', 'lab', 'import_permit', 'ownership'];

const ISSUE_POSITIVE = 'Xét nghiệm dương tính bệnh truyền nhiễm';
const ISSUE_TYPES = [ISSUE_POSITIVE, 'Đã yêu cầu bổ sung nhưng giấy tờ vẫn không đạt', 'Khác'];

// ===== Ngày làm việc =====
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isWorkingDay = d => d.getDay() !== 0 && d.getDay() !== 6 && !HOLIDAYS.includes(dayKey(d));
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const formatDate = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const formatTime = t => { const d = new Date(t); return `${formatDate(t)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const formatDeadline = t => `${WEEKDAYS[new Date(t).getDay()]} ${formatTime(t)}`;

function startOfDay(t) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d;
}

function atHour(day, hour, minute = 0) {
    const d = new Date(day);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
}

// Dịch n ngày làm việc (n > 0 tiến, n < 0 lùi), trả về 00:00 của ngày đó
function shiftWorkingDays(t, n) {
    const d = startOfDay(t);
    const step = n > 0 ? 1 : -1;
    let left = Math.abs(n);
    while (left > 0) {
        d.setDate(d.getDate() + step);
        if (isWorkingDay(d)) left--;
    }
    return d;
}

// Số ngày làm việc trong khoảng (from, to] tính theo ngày
function workingDaysBetween(from, to) {
    const d = startOfDay(from);
    const end = startOfDay(to);
    let count = 0;
    while (d < end) {
        d.setDate(d.getDate() + 1);
        if (isWorkingDay(d)) count++;
    }
    return count;
}

// ===== Dữ liệu mẫu (mốc thời gian tương đối so với hôm nay) =====
const today = startOfDay(Date.now());
const baseDay = isWorkingDay(today) ? today : shiftWorkingDays(today, -1);
const workdaysAgo = (k, hour = 9) => atHour(k === 0 ? baseDay : shiftWorkingDays(baseDay, -k), hour);
const daysFromToday = k => { const d = new Date(today); d.setDate(d.getDate() + k); return d.getTime(); };

// Bộ file khách đã tải lên cho một ngựa; decided: kết quả xác minh có sẵn (dữ liệu mẫu)
const FILE_PREFIX = { passport: 'Ho_chieu', vaccine: 'Tiem_phong', lab: 'Xet_nghiem', import_permit: 'Giay_phep_NK', ownership: 'So_huu' };

function docsFor(horse, crossBorder, decided = {}) {
    const slug = horse.name.replace(/\s+/g, '_');
    const docs = {};
    (crossBorder ? DOCS_CROSS_BORDER : DOCS_DOMESTIC).forEach(key => {
        docs[key] = { file: `${FILE_PREFIX[key]}_${slug}.pdf`, decision: null, reason: '', ...decided[key] };
    });
    return docs;
}

function makeOrder(o) {
    o.horses.forEach(h => { h.docs = docsFor(h, !!o.border, h.decided); delete h.decided; });
    o.pausedWorkingDays = o.pausedWorkingDays || 0;
    return o;
}

const orders = [
    makeOrder({
        id: 'EQ-2026-1065', customer: 'Trang trại Tây Ninh Stud', assignedAt: workdaysAgo(0, 9), departure: daysFromToday(12),
        from: 'Trang trại Tây Ninh Stud (Tây Ninh, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Tây Ninh → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', coordinator: 'Phạm Tâm',
        customerNote: 'Ngựa Vàm Cỏ nhạy cảm tiếng ồn.',
        horses: [
            { name: 'Bà Đen', breed: 'Thoroughbred', sex: 'Cái', chip: 'VN-610118', owner: 'Trang trại Tây Ninh Stud' },
            { name: 'Vàm Cỏ', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-610125', owner: 'Trang trại Tây Ninh Stud' }
        ],
        status: 'verifying'
    }),
    makeOrder({
        id: 'EQ-2026-1066', customer: 'CLB Ngựa Phú Thọ', assignedAt: workdaysAgo(1, 14), departure: daysFromToday(9),
        from: 'Trường đua Phú Thọ (TP.HCM, VN)', to: 'Trường đua Angkor (Siem Reap, KH)',
        routeShort: 'TP.HCM → Siem Reap (KH)', border: 'Mộc Bài – Bavet', coordinator: 'Trần Minh',
        horses: [
            { name: 'Xích Thố', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-503311', owner: 'CLB Ngựa Phú Thọ' }
        ],
        status: 'verifying'
    }),
    makeOrder({
        id: 'EQ-2026-1067', customer: 'Trang trại Ba Vì', assignedAt: workdaysAgo(1, 10), departure: daysFromToday(11),
        from: 'Trang trại Ba Vì (Hà Nội, VN)', to: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)',
        routeShort: 'Ba Vì → Sóc Sơn (Hà Nội)', border: null, coordinator: 'Trần Minh',
        horses: [
            { name: 'Tản Viên', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-330145', owner: 'Trang trại Ba Vì',
              decided: { passport: { decision: 'valid' }, vaccine: { decision: 'valid' }, ownership: { decision: 'valid' } } },
            { name: 'Sơn Tinh', breed: 'Thoroughbred', sex: 'Thiến', chip: 'VN-330152', owner: 'Trang trại Ba Vì',
              decided: { passport: { decision: 'invalid', reason: 'Microchip trên hộ chiếu là VN-330125, không trùng microchip khai báo VN-330152' } } },
            { name: 'Mỵ Nương', breed: 'Arabian', sex: 'Cái', chip: 'VN-330168', owner: 'Trang trại Ba Vì' }
        ],
        status: 'verifying'
    }),
    makeOrder({
        id: 'EQ-2026-1068', customer: 'Savan Horse Club', assignedAt: workdaysAgo(2, 9), departure: daysFromToday(14),
        from: 'Trường đua Savannakhet (Savannakhet, LA)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Savannakhet (LA) → Đà Nẵng', border: 'Densavanh – Lao Bảo', coordinator: 'Phạm Tâm',
        horses: [
            { name: 'Mekong Wind', breed: 'Arabian', sex: 'Cái', chip: 'LA-118903', owner: 'Savan Horse Club',
              decided: { passport: { decision: 'valid' }, vaccine: { decision: 'invalid', reason: 'Ảnh chụp mờ, không đọc được ngày tiêm' }, lab: { decision: 'valid' }, import_permit: { decision: 'valid' }, ownership: { decision: 'valid' } } }
        ],
        status: 'waiting_customer', pausedSince: workdaysAgo(1, 15), customerMessage: 'Vui lòng chụp lại rõ trang có dấu và ngày tiêm.'
    }),
    makeOrder({
        id: 'EQ-2026-1062', customer: 'Đại Nam Racing', assignedAt: workdaysAgo(3, 9), departure: daysFromToday(10),
        from: 'Trường đua Đại Nam (Bình Dương, VN)', to: 'Trang trại Mekong (Cần Thơ, VN)',
        routeShort: 'Bình Dương → Cần Thơ', border: null, coordinator: 'Trần Minh',
        horses: [
            { name: 'Hỏa Tiễn', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-420017', owner: 'Đại Nam Racing',
              decided: { passport: { decision: 'valid' }, vaccine: { decision: 'valid' }, ownership: { decision: 'valid' } } }
        ],
        status: 'passed', closedAt: workdaysAgo(1, 16)
    }),
    makeOrder({
        id: 'EQ-2026-1069', customer: 'HKD Du lịch Ngựa Quy Nhơn', assignedAt: workdaysAgo(4, 9), departure: daysFromToday(8),
        from: 'Quy Nhơn (Bình Định, VN)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Quy Nhơn → Đà Nẵng', border: null, coordinator: 'Phạm Tâm',
        horses: [
            { name: 'Ngựa kéo số 3', breed: 'Ngựa nội (kéo xe)', sex: 'Đực', chip: 'VN-077003', owner: 'HKD Du lịch Ngựa Quy Nhơn',
              decided: { passport: { decision: 'invalid', reason: 'Hộ chiếu ghi mục đích sử dụng: kéo xe du lịch' }, vaccine: { decision: 'valid' }, ownership: { decision: 'valid' } } }
        ],
        status: 'reported', closedAt: workdaysAgo(3, 11),
        report: {
            horses: ['Ngựa kéo số 3'], type: 'Đã yêu cầu bổ sung nhưng giấy tờ vẫn không đạt', disease: '', curable: null,
            note: 'Khách không cung cấp được giấy tờ chứng minh là ngựa đua; hộ chiếu ghi ngựa kéo xe du lịch.',
            evidence: ['Ngựa kéo số 3 · Hộ chiếu ngựa / Microchip']
        }
    }),
    // Kiểm tra lại (phương án D): khách không đồng ý kết luận của Nguyễn Thị Thu, Manager giao cho mình
    makeOrder({
        id: 'EQ-2026-1073', customer: 'Hoàng Gia Stud', assignedAt: workdaysAgo(0, 10), departure: daysFromToday(13),
        from: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)', to: 'Trường đua Luang Prabang (Luang Prabang, LA)',
        routeShort: 'Hà Nội → Luang Prabang (LA)', border: 'Tây Trang – Sop Hun', coordinator: 'Trần Minh',
        horses: [
            { name: 'Ngọc Hoàng', breed: 'Arabian', sex: 'Đực', chip: 'VN-902214', owner: 'Hoàng Gia Stud' }
        ],
        review: {
            originalInspector: 'Nguyễn Thị Thu',
            finding: 'Xét nghiệm dương tính bệnh truyền nhiễm (EIA, không chữa được): phiếu xét nghiệm ghi EIA dương tính.',
            customerReason: 'Phiếu xét nghiệm cũ bị nhầm mẫu. Trại đã xét nghiệm lại tại phòng xét nghiệm khác, kết quả âm tính (đính kèm).',
            customerFiles: ['Xet_nghiem_lai_Ngoc_Hoang.pdf']
        },
        status: 'verifying'
    })
];

// ===== Tính toán =====
const requiredDocs = order => order.border ? DOCS_CROSS_BORDER : DOCS_DOMESTIC;
const allDocs = order => order.horses.flatMap(h => requiredDocs(order).map(key => ({ horse: h, key, doc: h.docs[key] })));

function progressOf(order) {
    const docs = allDocs(order);
    const decided = docs.filter(d => d.doc.decision).length;
    const invalid = docs.filter(d => d.doc.decision === 'invalid').length;
    return { total: docs.length, decided, invalid, allValid: decided === docs.length && invalid === 0, allDecided: decided === docs.length };
}

function deadlineOf(order) {
    const sla = atHour(shiftWorkingDays(order.assignedAt, SLA_WORKING_DAYS + order.pausedWorkingDays), WORK_END_HOUR);
    const cap = new Date(order.departure);
    cap.setDate(cap.getDate() - CAP_DAYS);
    while (!isWorkingDay(cap)) cap.setDate(cap.getDate() - 1);
    const capTime = atHour(cap, WORK_END_HOUR);
    return sla <= capTime
        ? { time: sla, source: `${SLA_WORKING_DAYS} ngày làm việc` }
        : { time: capTime, source: `Khởi hành − ${CAP_DAYS} ngày` };
}

function deadlineBadge(order) {
    if (order.status === 'waiting_customer') return `<span class="status-badge status-gray"><i class="fa-solid fa-pause"></i> Tạm dừng từ ${formatDate(order.pausedSince)}</span>`;
    if (order.status !== 'verifying') return `<span class="kd-muted">Kết luận lúc ${formatTime(order.closedAt)}</span>`;
    const deadline = deadlineOf(order).time;
    if (Date.now() > deadline) return '<span class="status-badge status-red">Quá hạn</span>';
    const left = workingDaysBetween(Date.now(), deadline);
    if (left === 0) return '<span class="status-badge status-red">Hạn hôm nay 17:00</span>';
    if (left === 1) return `<span class="status-badge status-orange">Còn 1 ngày · ${formatDeadline(deadline)}</span>`;
    return `<span class="status-badge status-green">Còn ${left} ngày · ${formatDeadline(deadline)}</span>`;
}

function statusBadge(order) {
    switch (order.status) {
        case 'verifying': {
            const p = progressOf(order);
            return `${order.review ? '<span class="status-badge status-orange"><i class="fa-solid fa-magnifying-glass"></i> Kiểm tra lại</span> ' : ''}<span class="status-badge status-blue">Đang xác minh ${p.decided}/${p.total}</span>`;
        }
        case 'reported': return '<span class="status-badge status-orange">Đã báo cáo Manager</span>';
        case 'waiting_customer': return '<span class="status-badge status-orange">Chờ khách bổ sung</span>';
        case 'passed': return '<span class="status-badge status-green">Hợp lệ · đã chuyển Điều phối</span>';
    }
}

// ===== Danh sách =====
const TABS = [
    ['verifying', 'Cần xác minh', o => o.status === 'verifying'],
    ['waiting_customer', 'Chờ khách bổ sung', o => o.status === 'waiting_customer'],
    ['done', 'Đã xử lý', o => ['passed', 'reported'].includes(o.status)]
];
let currentTab = 'verifying';

function renderList() {
    document.getElementById('me-name').textContent = `${ME.name} · ${ME.id}`;

    const verifying = orders.filter(o => o.status === 'verifying');
    const dueSoon = verifying.filter(o => workingDaysBetween(Date.now(), deadlineOf(o).time) <= 1);
    const stats = [
        ['Cần xác minh', verifying.length, 'fa-regular fa-clock icon-orange', 'line-orange'],
        ['Sắp đến hạn (≤ 1 ngày)', dueSoon.length, 'fa-solid fa-triangle-exclamation icon-yellow', 'line-yellow'],
        ['Chờ khách bổ sung', orders.filter(o => o.status === 'waiting_customer').length, 'fa-solid fa-pause icon-gray', 'line-blue'],
        ['Đã xử lý', orders.filter(o => ['passed', 'reported'].includes(o.status)).length, 'fa-regular fa-circle-check icon-green', 'line-green']
    ];
    document.getElementById('kd-stats').innerHTML = stats.map(([label, value, icon, line]) => `
        <div class="stat-card">
            <div class="stat-header"><span>${label}</span><i class="${icon}"></i></div>
            <div class="stat-value">${value} <span class="stat-unit">đơn</span></div>
            <div class="stat-line ${line}"></div>
        </div>`).join('');

    document.getElementById('kd-tabs').innerHTML = TABS.map(([key, label, match]) =>
        `<button class="kd-tab ${key === currentTab ? 'active' : ''}" onclick="switchTab('${key}')">${label} (${orders.filter(match).length})</button>`
    ).join('');

    const match = TABS.find(t => t[0] === currentTab)[2];
    const list = orders.filter(match).sort((a, b) =>
        a.status === 'verifying' && b.status === 'verifying' ? deadlineOf(a).time - deadlineOf(b).time : b.assignedAt - a.assignedAt);
    document.getElementById('kd-list').innerHTML = list.length
        ? list.map(order => `
            <tr>
                <td class="bold">${order.id}</td>
                <td class="bold">${order.customer}</td>
                <td>${order.routeShort}${order.border ? `<div class="kd-muted"><i class="fa-solid fa-flag"></i> ${order.border}</div>` : ''}</td>
                <td><span class="bold">${order.horses.length}</span> ngựa</td>
                <td>${formatDate(order.departure)}</td>
                <td>${deadlineBadge(order)}</td>
                <td>${statusBadge(order)}</td>
                <td><button class="kd-btn ${order.status === 'verifying' ? 'kd-btn-primary' : 'kd-btn-light'}" onclick="showDetail('${order.id}')">${order.status === 'verifying' ? 'Xác minh' : 'Xem'}</button></td>
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

// ===== Chi tiết & xác minh =====
let order = null;
let horseIndex = 0;

function infoRow(label, value) {
    return `<div class="kd-info-row"><span>${label}</span><span>${value}</span></div>`;
}

function showDetail(orderId) {
    order = orders.find(o => o.id === orderId);
    horseIndex = 0;
    document.getElementById('list-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    renderDetail();
    window.scrollTo(0, 0);
}

function renderDetail() {
    const editable = order.status === 'verifying';
    const p = progressOf(order);

    document.getElementById('d-crumb').textContent = order.id;
    document.getElementById('d-title').textContent = `Xác minh hồ sơ ${order.id}`;
    document.getElementById('d-badge').innerHTML = statusBadge(order);
    document.getElementById('d-progress').textContent = `Đã xác minh ${p.decided}/${p.total} giấy tờ`;

    const r = order.report;
    const banners = {
        verifying: Date.now() > deadlineOf(order).time
            ? ['kd-alert-danger', 'fa-triangle-exclamation', `Đơn đã quá hạn xử lý (${formatDeadline(deadlineOf(order).time)}). Hệ thống sẽ tự động chuyển đơn cho kiểm dịch viên khác.`]
            : ['kd-alert-info', 'fa-circle-info', `Hạn xử lý: <strong>${formatDeadline(deadlineOf(order).time)}</strong> (${deadlineOf(order).source}). Quá hạn, hệ thống sẽ tự động chuyển đơn cho kiểm dịch viên khác.`],
        waiting_customer: ['kd-alert-warning', 'fa-pause', `Đã gửi yêu cầu bổ sung lúc <strong>${formatTime(order.pausedSince)}</strong>${order.requestOriginal ? ', kèm yêu cầu <strong>nộp bản gốc để đối chiếu</strong>' : ''}. Đồng hồ xử lý tạm dừng cho tới khi khách nộp lại.${order.customerMessage ? ` Lời nhắn đã gửi: "${order.customerMessage}"` : ''}`],
        passed: ['kd-alert-success', 'fa-circle-check', `Đã xác nhận hồ sơ hợp lệ lúc <strong>${formatTime(order.closedAt)}</strong>. Đơn đã chuyển cho Điều phối viên <strong>${order.coordinator}</strong> lập lộ trình.`],
        reported: r ? ['kd-alert-warning', 'fa-user-tie', `Đã báo cáo Manager lúc <strong>${formatTime(order.closedAt)}</strong> — ${r.type}${r.disease ? ` (${r.disease}, ${r.curable ? 'chữa được' : 'không chữa được'})` : ''}. Ngựa: ${r.horses.join(', ')}.<br>
            Kết luận: ${r.note}<br>Căn cứ: ${r.evidence.join('; ')}.<br>
            Manager sẽ đưa phương án cho khách chọn (bỏ ngựa, thay ngựa, dời ngày, kiểm tra lại, hủy đơn). Bạn chỉ xử lý tiếp nếu được giao ngựa mới hoặc giao kiểm tra lại.`] : null
    };
    const [cls, icon, html] = banners[order.status];
    // Kiểm tra lại (phương án D): hiện kết luận cũ và ý kiến của khách
    const reviewBox = order.review ? `
        <div class="kd-alert kd-alert-warning"><i class="fa-solid fa-magnifying-glass"></i><div>
            <strong>Kiểm tra lại theo yêu cầu của khách.</strong> Kết luận của kiểm dịch viên <strong>${order.review.originalInspector}</strong>: ${order.review.finding}<br>
            Ý kiến của khách: "${order.review.customerReason}"
            ${order.review.customerFiles.map(f => `<button class="kd-btn kd-btn-light kd-btn-sm" onclick="previewAppendix('${f}')"><i class="fa-solid fa-file-pdf"></i> ${f}</button>`).join(' ')}<br>
            Hãy xác minh lại <strong>độc lập, từ đầu</strong>. Nếu vấn đề vẫn còn, dùng "Báo cáo vấn đề không khắc phục được" để chuyển Manager.
        </div></div>` : '';
    document.getElementById('d-banner').innerHTML = `${reviewBox}<div class="kd-alert ${cls}"><i class="fa-solid ${icon}"></i><div>${html}</div></div>`;

    // Tab từng ngựa, kèm tình trạng giấy tờ của ngựa đó
    document.getElementById('d-horse-tabs').innerHTML = order.horses.map((h, i) => {
        const docs = requiredDocs(order).map(key => h.docs[key]);
        const icon = docs.some(d => d.decision === 'invalid') ? '<i class="fa-solid fa-circle-xmark kd-red"></i>'
            : docs.every(d => d.decision === 'valid') ? '<i class="fa-solid fa-circle-check kd-green"></i>'
            : '<i class="fa-regular fa-circle kd-muted"></i>';
        return `<button class="kd-horse-tab ${i === horseIndex ? 'active' : ''}" onclick="selectHorse(${i})">${icon} ${h.name}<span class="kd-muted">${h.chip}</span></button>`;
    }).join('');

    const horse = order.horses[horseIndex];
    document.getElementById('d-docs').innerHTML = `
        <div class="kd-horse-info">${horse.name} · ${horse.breed} · ${horse.sex} · Microchip khai báo <strong>${horse.chip}</strong></div>
        ${requiredDocs(order).map(key => docRow(horse, key, editable)).join('')}`;

    document.getElementById('d-side').innerHTML = sidePanel(p, editable);
}

function docRow(horse, key, editable) {
    const doc = horse.docs[key];
    const ref = `${order.horses.indexOf(horse)},'${key}'`;
    const checklist = `
        <div class="kd-checklist">
            <div class="kd-checklist-title"><i class="fa-solid fa-list-check"></i> Cần đối chiếu</div>
            <ul>${checklistFor(key, order, horse).map(item => `<li>${item}</li>`).join('')}</ul>
        </div>`;

    const decision = editable ? `
        <div class="kd-decision">
            <button class="kd-choice ${doc.decision === 'valid' ? 'valid' : ''}" onclick="decide(${ref}, 'valid')"><i class="fa-solid fa-check"></i> Hợp lệ</button>
            <button class="kd-choice ${doc.decision === 'invalid' ? 'invalid' : ''}" onclick="decide(${ref}, 'invalid')"><i class="fa-solid fa-xmark"></i> Không hợp lệ</button>
        </div>
        ${doc.decision === 'invalid' ? `<input class="kd-input kd-reason" data-ref="${order.horses.indexOf(horse)}-${key}" value="${doc.reason.replace(/"/g, '&quot;')}" placeholder="Lý do (khách sẽ thấy nội dung này) *" oninput="setReason(${ref}, this.value)">` : ''}`
        : `<div class="kd-decision-view">${doc.decision === 'valid' ? '<span class="status-badge status-green">Hợp lệ</span>' : doc.decision === 'invalid' ? `<span class="status-badge status-red">Không hợp lệ</span> <span class="kd-muted">${doc.reason}</span>` : '<span class="kd-muted">Chưa xác minh</span>'}</div>`;

    return `
        <div class="kd-doc ${doc.decision ? 'kd-doc-' + doc.decision : ''}">
            <div class="kd-doc-head">
                <div class="kd-doc-name">${DOC_LABEL[key]}</div>
                <button class="kd-btn kd-btn-light" onclick="previewDoc(${ref})"><i class="fa-solid fa-file-pdf"></i> Mở ${doc.file}</button>
            </div>
            ${checklist}
            ${decision}
        </div>`;
}

function sidePanel(p, editable) {
    const info = `
        <div class="kd-card">
            <div class="kd-card-header"><h3><i class="fa-solid fa-file-lines"></i> Thông tin đơn</h3></div>
            <div class="kd-card-body">
                ${infoRow('Khách hàng', order.customer)}
                ${infoRow('Điểm đi', order.from)}
                ${infoRow('Điểm đến', order.to)}
                ${infoRow('Loại tuyến', order.border ? `Xuyên quốc gia · ${order.border}` : 'Nội địa')}
                ${infoRow('Khởi hành', `<strong>${formatDate(order.departure)}</strong>`)}
                ${infoRow('Số ngựa', order.horses.length)}
                ${infoRow('Được giao lúc', formatTime(order.assignedAt))}
                ${order.customerNote ? `<div class="kd-note"><i class="fa-solid fa-comment-dots"></i> Khách ghi chú: ${order.customerNote}</div>` : ''}
            </div>
        </div>`;
    if (!editable) return info;

    const deadline = deadlineOf(order);
    const passHint = p.allValid ? '' : `Cần tất cả ${p.total} giấy tờ ở trạng thái Hợp lệ`;
    const requestHint = !p.allDecided ? `Xác minh hết giấy tờ trước (còn ${p.total - p.decided})` : p.invalid === 0 ? 'Không có giấy tờ Không hợp lệ' : '';
    return `
        <div class="kd-card">
            <div class="kd-card-header"><h3><i class="fa-solid fa-gavel"></i> Kết luận</h3></div>
            <div class="kd-card-body">
                <div class="kd-deadline ${Date.now() > deadline.time || workingDaysBetween(Date.now(), deadline.time) === 0 ? 'urgent' : ''}">
                    <div><i class="fa-regular fa-clock"></i> Hạn: <strong>${formatDeadline(deadline.time)}</strong></div>
                    <div class="kd-muted">${deadline.source}</div>
                </div>
                <div class="kd-progress"><div style="width: ${Math.round(p.decided / p.total * 100)}%"></div></div>
                <div class="kd-muted" style="margin-bottom: 12px;">Đã xác minh ${p.decided}/${p.total} · Không hợp lệ ${p.invalid}</div>

                <button class="kd-btn kd-btn-primary kd-btn-full" ${p.allValid ? '' : 'disabled'} onclick="openPass()"><i class="fa-solid fa-check"></i> Hồ sơ hợp lệ → chuyển Điều phối</button>
                ${passHint ? `<p class="kd-hint">${passHint}</p>` : ''}
                <button class="kd-btn kd-btn-warning kd-btn-full" ${requestHint ? 'disabled' : ''} onclick="openRequest()"><i class="fa-solid fa-rotate-left"></i> Yêu cầu khách bổ sung</button>
                ${requestHint ? `<p class="kd-hint">${requestHint}</p>` : ''}
                <button class="kd-btn kd-btn-danger-outline kd-btn-full" ${p.invalid ? '' : 'disabled'} onclick="openReport()"><i class="fa-solid fa-flag"></i> Báo cáo vấn đề không khắc phục được</button>
                <p class="kd-hint">${p.invalid ? 'Chuyển Manager đưa phương án cho khách. Kiểm dịch viên không từ chối đơn.' : 'Cần ít nhất 1 giấy tờ Không hợp lệ làm căn cứ'}</p>
            </div>
        </div>
        ${info}`;
}

function selectHorse(i) {
    horseIndex = i;
    renderDetail();
}

function decide(hIndex, key, decision) {
    const horse = order.horses[hIndex];
    const doc = horse.docs[key];
    doc.decision = doc.decision === decision ? null : decision;
    if (doc.decision !== 'invalid') doc.reason = '';
    renderDetail();
    if (doc.decision === 'invalid') {
        const input = document.querySelector(`.kd-reason[data-ref="${hIndex}-${key}"]`);
        if (input) input.focus();
    }
}

function setReason(hIndex, key, value) {
    order.horses[hIndex].docs[key].reason = value;
    const input = document.querySelector(`.kd-reason[data-ref="${hIndex}-${key}"]`);
    if (input) input.classList.remove('kd-input-error');
}

// ===== Modal =====
// Gõ vào ô đang báo lỗi thì bỏ viền đỏ
document.addEventListener('input', e => e.target.classList.remove('kd-input-error'));

function openModal(title, body, actions) {
    document.getElementById('m-title').innerHTML = title;
    document.getElementById('m-body').innerHTML = body;
    document.getElementById('m-actions').innerHTML = `<button class="kd-btn kd-btn-light" onclick="closeModal()">Hủy</button>${actions}`;
    document.getElementById('kd-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('kd-modal').style.display = 'none';
}

function previewDoc(hIndex, key) {
    const horse = order.horses[hIndex];
    const doc = horse.docs[key];
    document.getElementById('m-title').innerHTML = `${DOC_LABEL[key]} · ${horse.name}`;
    document.getElementById('m-body').innerHTML = `
        <div class="kd-preview"><i class="fa-solid fa-file-pdf"></i><div>${doc.file}</div><div class="kd-muted">Bản xem trước tài liệu khách tải lên</div></div>`;
    document.getElementById('m-actions').innerHTML = '<button class="kd-btn kd-btn-light" onclick="closeModal()">Đóng</button>';
    document.getElementById('kd-modal').style.display = 'flex';
}

function openPass() {
    const p = progressOf(order);
    openModal(`Xác nhận hồ sơ ${order.id} hợp lệ?`, `
        <ul class="kd-list">
            <li><i class="fa-solid fa-circle-check kd-green"></i> ${order.horses.length} ngựa · ${p.total} giấy tờ đều Hợp lệ.</li>
            <li><i class="fa-solid fa-arrow-right kd-blue"></i> Đơn chuyển cho Điều phối viên <strong>${order.coordinator}</strong> lập lộ trình.</li>
            <li><i class="fa-solid fa-lock kd-muted"></i> Sau khi xác nhận, bạn không sửa kết quả xác minh được nữa.</li>
        </ul>`,
        '<button class="kd-btn kd-btn-primary" onclick="confirmPass()"><i class="fa-solid fa-check"></i> Xác nhận hợp lệ</button>');
}

function confirmPass() {
    order.status = 'passed';
    order.closedAt = Date.now();
    closeModal();
    showToast(`Đã chuyển ${order.id} cho Điều phối viên ${order.coordinator}`);
    renderDetail();
}

function invalidItems() {
    return allDocs(order).filter(d => d.doc.decision === 'invalid');
}

// Mọi giấy tờ Không hợp lệ phải có lý do (khách và Manager sẽ đọc lý do này); thiếu thì nhảy tới ô đó
function reasonsComplete() {
    const missing = invalidItems().filter(d => !d.doc.reason.trim());
    if (!missing.length) return true;
    const first = missing[0];
    horseIndex = order.horses.indexOf(first.horse);
    renderDetail();
    const input = document.querySelector(`.kd-reason[data-ref="${horseIndex}-${first.key}"]`);
    if (input) { input.classList.add('kd-input-error'); input.focus(); }
    showToast(`Còn ${missing.length} giấy tờ Không hợp lệ chưa ghi lý do`, 'error');
    return false;
}

function openRequest() {
    if (!reasonsComplete()) return;
    openModal(`Yêu cầu khách bổ sung · ${order.id}`, `
        <p class="kd-lead">Khách sẽ nhận danh sách sau và nộp lại đúng các giấy tờ này:</p>
        <table class="kd-table">
            <thead><tr><th>Ngựa</th><th>Giấy tờ</th><th>Lý do</th></tr></thead>
            <tbody>${invalidItems().map(d => `<tr><td>${d.horse.name}</td><td>${DOC_LABEL[d.key]}</td><td>${d.doc.reason}</td></tr>`).join('')}</tbody>
        </table>
        <label class="kd-evidence-item" style="padding-left: 0;"><input type="checkbox" id="m-original"> Yêu cầu nộp <strong>bản gốc</strong> để đối chiếu (khi nghi giấy tờ không thật)</label>
        <label class="kd-label">Lời nhắn thêm cho khách (không bắt buộc)</label>
        <textarea id="m-message" class="kd-input" rows="2" placeholder="Ví dụ: chụp rõ trang có dấu..."></textarea>
        <p class="kd-hint"><i class="fa-solid fa-pause"></i> Đồng hồ xử lý tạm dừng cho tới khi khách nộp lại.</p>`,
        '<button class="kd-btn kd-btn-warning" onclick="confirmRequest()"><i class="fa-solid fa-paper-plane"></i> Gửi yêu cầu</button>');
}

function confirmRequest() {
    order.status = 'waiting_customer';
    order.pausedSince = Date.now();
    order.customerMessage = document.getElementById('m-message').value.trim();
    order.requestOriginal = document.getElementById('m-original').checked;
    closeModal();
    showToast(`Đã gửi yêu cầu bổ sung ${invalidItems().length} giấy tờ cho khách`);
    renderDetail();
}

function openReport() {
    if (!reasonsComplete()) return;
    const affected = order.horses.filter(h => requiredDocs(order).some(key => h.docs[key].decision === 'invalid'));
    openModal(`Báo cáo vấn đề không khắc phục được · ${order.id}`, `
        <div class="kd-alert kd-alert-info" style="margin-bottom: 4px;"><i class="fa-solid fa-circle-info"></i><div>
            Dùng khi <strong>không thể khắc phục bằng bổ sung giấy tờ</strong>. Báo cáo chuyển tới Manager; Manager đưa phương án cho khách chọn
            (bỏ ngựa, thay ngựa, dời ngày, kiểm tra lại, hủy đơn). Bạn không từ chối đơn.</div></div>
        <label class="kd-label">Ngựa bị ảnh hưởng <span class="kd-red">*</span></label>
        <div id="m-horse-box" class="kd-evidence">
            ${order.horses.map((h, i) => `<label class="kd-evidence-item"><input type="checkbox" class="m-horse" value="${i}" ${affected.includes(h) ? 'checked' : ''} onchange="document.getElementById('m-horse-box').classList.remove('kd-input-error')"> ${h.name} · ${h.chip}</label>`).join('')}
        </div>
        <label class="kd-label">Loại vấn đề <span class="kd-red">*</span></label>
        <select id="m-issue-type" class="kd-input" onchange="toggleDisease()">${ISSUE_TYPES.map(t => `<option>${t}</option>`).join('')}</select>
        <div id="m-disease-box">
            <label class="kd-label">Tên bệnh <span class="kd-red">*</span></label>
            <input id="m-disease" class="kd-input" placeholder="Ví dụ: EIA, cúm ngựa">
            <label class="kd-label">Bệnh có chữa được không? <span class="kd-red">*</span></label>
            <label class="kd-evidence-item"><input type="radio" name="m-curable" value="yes"> Chữa được: điều trị rồi xét nghiệm lại (cho phép phương án dời ngày)</label>
            <label class="kd-evidence-item"><input type="radio" name="m-curable" value="no"> Không chữa được</label>
        </div>
        <label class="kd-label">Kết luận chuyên môn <span class="kd-red">*</span></label>
        <textarea id="m-report-note" class="kd-input" rows="3" placeholder="Mô tả cụ thể điều bạn thấy trên giấy tờ..."></textarea>
        <label class="kd-label">Căn cứ (giấy tờ đã đánh dấu Không hợp lệ)</label>
        <ul class="kd-list" style="margin-top: 6px;">${invalidItems().map(d => `<li><i class="fa-solid fa-circle-xmark kd-red"></i> ${d.horse.name} · ${DOC_LABEL[d.key]}: ${d.doc.reason}</li>`).join('')}</ul>`,
        '<button class="kd-btn kd-btn-danger" onclick="confirmReport()"><i class="fa-solid fa-flag"></i> Gửi báo cáo cho Manager</button>');
    toggleDisease();
}

function toggleDisease() {
    document.getElementById('m-disease-box').style.display = document.getElementById('m-issue-type').value === ISSUE_POSITIVE ? 'block' : 'none';
}

function confirmReport() {
    const horses = [...document.querySelectorAll('.m-horse:checked')].map(cb => order.horses[Number(cb.value)].name);
    const type = document.getElementById('m-issue-type').value;
    const positive = type === ISSUE_POSITIVE;
    const disease = document.getElementById('m-disease');
    const curable = document.querySelector('input[name="m-curable"]:checked');
    const note = document.getElementById('m-report-note');
    if (!horses.length) {
        document.getElementById('m-horse-box').classList.add('kd-input-error');
        return;
    }
    if (positive && !disease.value.trim()) {
        disease.classList.add('kd-input-error');
        disease.focus();
        return;
    }
    if (positive && !curable) {
        showToast('Chọn bệnh chữa được hay không', 'error');
        return;
    }
    if (!note.value.trim()) {
        note.classList.add('kd-input-error');
        note.focus();
        return;
    }
    order.status = 'reported';
    order.closedAt = Date.now();
    order.report = {
        horses, type,
        disease: positive ? disease.value.trim() : '',
        curable: positive ? curable.value === 'yes' : null,
        note: note.value.trim(),
        evidence: invalidItems().map(d => `${d.horse.name} · ${DOC_LABEL[d.key]}`)
    };
    closeModal();
    showToast(`Đã gửi báo cáo ${order.id} cho Manager`);
    renderDetail();
}

function previewAppendix(file) {
    document.getElementById('m-title').innerHTML = `Tài liệu khách gửi kèm`;
    document.getElementById('m-body').innerHTML = `
        <div class="kd-preview"><i class="fa-solid fa-file-pdf"></i><div>${file}</div><div class="kd-muted">Bản xem trước tài liệu khách tải lên</div></div>`;
    document.getElementById('m-actions').innerHTML = '<button class="kd-btn kd-btn-light" onclick="closeModal()">Đóng</button>';
    document.getElementById('kd-modal').style.display = 'flex';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `kd-toast ${type === 'error' ? 'kd-toast-error' : ''}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-check'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

renderList();
