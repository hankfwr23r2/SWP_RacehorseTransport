// ===== Lịch làm việc =====
// Thứ Hai – thứ Sáu, 08:00 – 17:00, trừ ngày lễ.
// Ngày lễ âm lịch (Tết Nguyên đán, Giỗ Tổ) và ngày nghỉ liền kề Quốc khánh thay đổi theo năm:
// cập nhật danh sách này theo thông báo chính thức hằng năm.
const WORK_END_HOUR = 17;
const HOLIDAYS = ['2026-01-01', '2026-04-30', '2026-05-01', '2026-09-02', '2027-01-01'];

// ===== Quy tắc hạn xử lý =====
// Hạn xử lý = mốc SỚM HƠN của:
//   (1) 17:00 ngày làm việc thứ N, đếm từ ngày làm việc kế tiếp sau ngày nhận việc
//   (2) 17:00 của (ngày khởi hành − CAP_DAYS); rơi vào ngày nghỉ thì lùi về ngày làm việc trước đó
// Đồng hồ tạm dừng khi đơn đang chờ khách bổ sung giấy tờ; thời gian dừng được cộng thêm vào hạn.
const SLA_WORKING_DAYS = { inspector: 2, coordinator: 2 };
const CAP_DAYS = { inspector: 7, coordinator: 5 };

// ===== Tự động chuyển người =====
// Điều kiện: đơn trễ hạn (quá hạn xử lý) HOẶC người phụ trách đang nghỉ.
// Người nhận: cùng vai trò, đang làm việc, chưa từng phụ trách đơn này; ưu tiên ít đơn đang xử lý nhất,
//             bằng nhau thì theo mã nhân viên. Đơn khởi hành sớm hơn được chuyển trước.
// Không tự chuyển khi: không còn người nhận, hoặc đã qua mốc chót theo ngày khởi hành
//   → manager xử lý: gia hạn đặc biệt → đề nghị khách dời ngày → từ chối đơn.
const MIN_LEAD_DAYS = 10;

const ROLE_LABEL = { inspector: 'Kiểm dịch viên', coordinator: 'Điều phối viên' };
const STEP_LABEL = { inspector: 'Kiểm dịch', coordinator: 'Lập lộ trình' };

// ===== Tiện ích ngày =====
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isWorkingDay = d => d.getDay() !== 0 && d.getDay() !== 6 && !HOLIDAYS.includes(dayKey(d));
const formatDate = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const formatTime = t => { const d = new Date(t); return `${formatDate(t)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const formatDeadline = t => `${WEEKDAYS[new Date(t).getDay()]} ${formatTime(t)}`;

function startOfDay(t) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d;
}

function atHour(day, hour) {
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
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

// ===== Dữ liệu mẫu (mốc thời gian tính tương đối so với hôm nay) =====
const today = startOfDay(Date.now());
const baseDay = isWorkingDay(today) ? today : shiftWorkingDays(today, -1);
const workdaysAgo = (k, hour = 9) => atHour(k === 0 ? baseDay : shiftWorkingDays(baseDay, -k), hour);
const daysFromToday = k => { const d = new Date(today); d.setDate(d.getDate() + k); return d.getTime(); };

// status: working | off (kèm offTo, offReason); kpi: số liệu trong tháng
const staff = [
    { id: 'KD-01', name: 'Phạm Văn Hưng', phone: '0901 234 567', role: 'inspector', status: 'working', kpi: { late: 2, transferredOut: 1 } },
    { id: 'KD-02', name: 'Nguyễn Thị Thu', phone: '0902 345 678', role: 'inspector', status: 'working', kpi: { late: 1, transferredOut: 1 } },
    { id: 'DP-01', name: 'Trần Minh', phone: '0903 456 789', role: 'coordinator', status: 'working', kpi: { late: 3, transferredOut: 1 } },
    { id: 'DP-02', name: 'Lê Quang', phone: '0904 567 890', role: 'coordinator', status: 'off', offTo: atHour(shiftWorkingDays(today, 2), 23), offReason: 'Ốm', kpi: { late: 0, transferredOut: 0 } },
    { id: 'DP-03', name: 'Phạm Tâm', phone: '0905 678 901', role: 'coordinator', status: 'working', kpi: { late: 1, transferredOut: 0 } }
];

// step: bước đang xử lý; assignedAt: lúc nhận việc; departure: ngày khởi hành
// pausedSince: đang chờ khách bổ sung (đồng hồ dừng); pausedWorkingDays: số ngày làm việc đã dừng trước đó
// history: các lần chuyển người [{ time, fromId, toId, reason, auto }]
const tasks = [
    {
        // Thu trễ → đã tự chuyển sang Hưng; Hưng lại trễ → không còn ai chưa từng phụ trách → manager xử lý
        orderId: 'EQ-2026-1047', customer: 'Royal Cambodia Stables', route: 'Phnom Penh (KH) → TP.HCM',
        step: 'inspector', assignee: 'KD-01', assignedAt: workdaysAgo(3), departure: daysFromToday(12),
        history: [{ time: workdaysAgo(3), fromId: 'KD-02', toId: 'KD-01', reason: 'Trễ hạn', auto: true }]
    },
    {
        orderId: 'EQ-2026-1060', customer: 'Trang trại Tây Ninh Stud', route: 'Tây Ninh → Phnom Penh (KH)',
        step: 'inspector', assignee: 'KD-01', assignedAt: workdaysAgo(0), departure: daysFromToday(8)
    },
    {
        orderId: 'EQ-2026-1046', customer: 'Savan Horse Club', route: 'Savannakhet (LA) → Đà Nẵng',
        step: 'inspector', assignee: 'KD-02', assignedAt: workdaysAgo(1), departure: daysFromToday(14)
    },
    {
        orderId: 'EQ-2026-1056', customer: 'Hoàng Gia Stud', route: 'Hà Nội → Luang Prabang (LA)',
        step: 'inspector', assignee: 'KD-02', assignedAt: workdaysAgo(2), departure: daysFromToday(15),
        pausedSince: workdaysAgo(1, 14)
    },
    {
        orderId: 'EQ-2026-1061', customer: 'CLB Ngựa Hà Thành', route: 'Hà Nội → Đà Nẵng',
        step: 'coordinator', assignee: 'DP-03', assignedAt: workdaysAgo(1), departure: daysFromToday(13)
    },
    {
        orderId: 'EQ-2026-1045', customer: 'CLB Ngựa Phú Thọ', route: 'TP.HCM → Siem Reap (KH)',
        step: 'coordinator', assignee: 'DP-03', assignedAt: workdaysAgo(0), departure: daysFromToday(10)
    },
    {
        // Minh trễ hôm qua → đã tự chuyển sang Tâm
        orderId: 'EQ-2026-1059', customer: 'Angkor Equestrian', route: 'Siem Reap (KH) → TP.HCM',
        step: 'coordinator', assignee: 'DP-03', assignedAt: workdaysAgo(1, 10), departure: daysFromToday(9),
        history: [{ time: workdaysAgo(1, 10), fromId: 'DP-01', toId: 'DP-03', reason: 'Trễ hạn', auto: true }]
    },
    {
        orderId: 'EQ-2026-1058', customer: 'Đại Nam Racing', route: 'Bình Dương → Cần Thơ',
        step: 'coordinator', assignee: 'DP-01', assignedAt: workdaysAgo(1), departure: daysFromToday(12)
    },
    {
        // Lê Quang đang nghỉ → hệ thống sẽ tự chuyển khi tải trang
        orderId: 'EQ-2026-1044', customer: 'Trường đua Thiên Mã', route: 'Hà Nội → Viêng Chăn (LA)',
        step: 'coordinator', assignee: 'DP-02', assignedAt: workdaysAgo(1), departure: daysFromToday(11)
    },
    {
        orderId: 'EQ-2026-1057', customer: 'Mekong Stud', route: 'Cần Thơ → Phnom Penh (KH)',
        step: 'coordinator', assignee: 'DP-02', assignedAt: workdaysAgo(0), departure: daysFromToday(13)
    }
];
tasks.forEach(t => { t.pausedWorkingDays = t.pausedWorkingDays || 0; t.history = t.history || []; });

// ===== Tính hạn & tình trạng =====
const findStaff = id => staff.find(s => s.id === id);
const tasksOf = staffId => tasks.filter(t => t.assignee === staffId);

function capDeadline(task) {
    const d = new Date(task.departure);
    d.setDate(d.getDate() - CAP_DAYS[task.step]);
    while (!isWorkingDay(d)) d.setDate(d.getDate() - 1);
    return atHour(d, WORK_END_HOUR);
}

function slaDeadline(task) {
    return atHour(shiftWorkingDays(task.assignedAt, SLA_WORKING_DAYS[task.step] + task.pausedWorkingDays), WORK_END_HOUR);
}

// Trả về { time, source } – source cho biết hạn đang lấy theo mốc nào
function deadlineOf(task) {
    if (task.specialDeadline) return { time: task.specialDeadline, source: 'Gia hạn đặc biệt' };
    const sla = slaDeadline(task);
    const cap = capDeadline(task);
    return sla <= cap
        ? { time: sla, source: `${SLA_WORKING_DAYS[task.step]} ngày làm việc` }
        : { time: cap, source: `Khởi hành − ${CAP_DAYS[task.step]} ngày` };
}

// Lý do cần chuyển người, hoặc null nếu không cần
function transferReason(task) {
    const assignee = findStaff(task.assignee);
    // Gia hạn đặc biệt = manager chấp nhận chờ người phụ trách đi làm lại
    if (assignee.status === 'off' && !task.specialDeadline) return 'Người phụ trách nghỉ';
    if (task.pausedSince) return null;
    if (Date.now() > deadlineOf(task).time) return 'Trễ hạn';
    return null;
}

// Người nhận hợp lệ, đã sắp theo thứ tự ưu tiên
function candidatesFor(task) {
    const previous = task.history.map(h => h.fromId);
    return staff
        .filter(s => s.role === task.step && s.status === 'working' && s.id !== task.assignee && !previous.includes(s.id))
        .sort((a, b) => tasksOf(a.id).length - tasksOf(b.id).length || a.id.localeCompare(b.id));
}

// Chạy mỗi lần dữ liệu thay đổi; đơn khởi hành sớm được xử lý trước
function autoTransfer() {
    const moved = [];
    [...tasks].sort((a, b) => a.departure - b.departure).forEach(task => {
        if (task.reschedule) return;
        const reason = transferReason(task);
        if (!reason || Date.now() >= capDeadline(task)) return;
        const to = candidatesFor(task)[0];
        if (!to) return;

        const from = findStaff(task.assignee);
        task.history.push({ time: Date.now(), fromId: from.id, toId: to.id, reason, auto: true });
        from.kpi.transferredOut++;
        if (reason === 'Trễ hạn') from.kpi.late++;
        task.assignee = to.id;
        task.assignedAt = Date.now();
        task.pausedWorkingDays = 0;
        delete task.specialDeadline;
        moved.push(task);
    });
    return moved;
}

// code: paused | on_track | due_soon | manager
function stateOf(task) {
    if (task.reschedule) return { code: 'manager', cause: `Đã đề nghị khách dời ngày khởi hành đến ${formatDate(task.reschedule.newDate)}, chờ khách phản hồi` };
    const reason = transferReason(task);
    if (reason) {
        const why = Date.now() >= capDeadline(task)
            ? 'đã qua mốc chót theo ngày khởi hành'
            : `không còn ${ROLE_LABEL[task.step].toLowerCase()} nào đang làm việc chưa từng phụ trách đơn`;
        return { code: 'manager', cause: `${reason}, ${why}` };
    }
    if (task.pausedSince) return { code: 'paused' };
    const remaining = workingDaysBetween(Date.now(), deadlineOf(task).time);
    return { code: remaining <= 1 ? 'due_soon' : 'on_track', remaining };
}

function stateBadge(task) {
    const s = stateOf(task);
    switch (s.code) {
        case 'paused': return `<span class="badge badge-muted"><i class="fa-solid fa-pause"></i> Tạm dừng - chờ khách bổ sung từ ${formatDate(task.pausedSince)}</span>`;
        case 'on_track': return `<span class="badge badge-success">Còn ${s.remaining} ngày làm việc</span>`;
        case 'due_soon': return `<span class="badge badge-warning">${s.remaining === 0 ? 'Hạn hôm nay' : 'Sắp đến hạn - còn 1 ngày'}</span>`;
        case 'manager': return `<span class="badge badge-danger"><i class="fa-solid fa-user-tie"></i> Cần manager xử lý</span><div class="route-border">${s.cause}</div>`;
    }
}

function deadlineCell(task) {
    if (task.pausedSince) return '<span class="text-muted">Tạm dừng</span>';
    const d = deadlineOf(task);
    return `${formatDeadline(d.time)}<div class="route-border">${d.source}</div>`;
}

// ===== Render =====
let currentTab = 'inspector';
let currentIssue = 'manager';

function renderAll() {
    // Hết thời gian nghỉ thì tự trở lại trạng thái đang làm việc
    staff.forEach(s => {
        if (s.status === 'off' && Date.now() > s.offTo) {
            s.status = 'working';
            delete s.offTo;
            delete s.offReason;
        }
    });
    const moved = autoTransfer();
    renderRules();
    renderStats();
    renderIssueTable();
    renderStaffTable();
    return moved;
}

function renderRules() {
    document.getElementById('rules-content').innerHTML = `
        <div class="rules-grid">
            <div>
                <h4>Lịch làm việc</h4>
                <ul>
                    <li>Thứ Hai – thứ Sáu, 08:00 – 17:00</li>
                    <li>Không tính thứ Bảy, Chủ nhật, ngày lễ</li>
                </ul>
                <h4>Hạn xử lý = mốc sớm hơn của</h4>
                <ul>
                    <li>Kiểm dịch: ${SLA_WORKING_DAYS.inspector} ngày làm việc · Lập lộ trình: ${SLA_WORKING_DAYS.coordinator} ngày làm việc (đếm từ ngày làm việc kế tiếp, hạn 17:00)</li>
                    <li>Kiểm dịch: khởi hành − ${CAP_DAYS.inspector} ngày · Lập lộ trình: khởi hành − ${CAP_DAYS.coordinator} ngày</li>
                    <li>Đang chờ khách bổ sung giấy tờ: đồng hồ tạm dừng</li>
                </ul>
                <h4>Phòng ngừa thiếu người</h4>
                <ul>
                    <li>Báo nghỉ khiến một vai trò không còn ai đang làm việc: cảnh báo, phải xác nhận</li>
                    <li>Trang Tiếp nhận: khóa nút tiếp nhận khi một vai trò không còn ai đang làm việc</li>
                </ul>
            </div>
            <div>
                <h4>Tự động chuyển người</h4>
                <ul>
                    <li><b>Khi nào:</b> đơn quá hạn xử lý, hoặc người phụ trách đang nghỉ</li>
                    <li><b>Chuyển cho:</b> người cùng vai trò, đang làm việc, chưa từng phụ trách đơn này</li>
                    <li><b>Ưu tiên:</b> ít đơn đang xử lý nhất; bằng nhau thì theo mã nhân viên</li>
                    <li><b>Thứ tự:</b> đơn khởi hành sớm hơn được chuyển trước</li>
                    <li>Người mới nhận việc từ lúc chuyển, hạn xử lý tính lại</li>
                </ul>
                <h4>Manager xử lý khi hệ thống không tự chuyển được</h4>
                <ol>
                    <li>Gia hạn đặc biệt (chờ người phụ trách) nếu vẫn kịp mốc chót</li>
                    <li>Đề nghị khách dời ngày khởi hành (ngày mới ≥ hôm nay + ${MIN_LEAD_DAYS} ngày)</li>
                    <li>Từ chối đơn: "Không đủ nhân sự xử lý kịp" (khách chưa thanh toán, không phát sinh hoàn tiền)</li>
                </ol>
            </div>
        </div>`;
}

const transferLog = () => tasks
    .flatMap(task => task.history.map(h => ({ ...h, task })))
    .sort((a, b) => b.time - a.time);

function renderStats() {
    document.getElementById('stat-off').textContent = staff.filter(s => s.status === 'off').length;
    document.getElementById('stat-tasks').textContent = tasks.length;
    document.getElementById('stat-auto').textContent = transferLog().filter(h => h.auto).length;
    document.getElementById('stat-manager').textContent = tasks.filter(t => stateOf(t).code === 'manager').length;
}

function renderIssueTable() {
    const managerTasks = tasks.filter(t => stateOf(t).code === 'manager').sort((a, b) => a.departure - b.departure);
    const log = transferLog();
    document.getElementById('count-manager').textContent = managerTasks.length;
    document.getElementById('count-log').textContent = log.length;

    const head = document.getElementById('issue-table-head');
    const body = document.getElementById('issue-table-body');
    if (currentIssue === 'manager') {
        head.innerHTML = '<tr><th>Mã Đơn hàng</th><th>Khách hàng</th><th>Khởi hành</th><th>Bước</th><th>Người phụ trách</th><th>Hạn xử lý</th><th>Tình trạng</th><th class="text-right">Thao tác</th></tr>';
        body.innerHTML = managerTasks.length
            ? managerTasks.map(task => `
                <tr>
                    <td class="font-semibold nowrap" style="color: #ea580c;">${task.orderId}</td>
                    <td class="text-muted">${task.customer}</td>
                    <td class="nowrap">${formatDate(task.departure)}</td>
                    <td>${STEP_LABEL[task.step]}</td>
                    <td>${findStaff(task.assignee).name}</td>
                    <td class="nowrap">${deadlineCell(task)}</td>
                    <td>${stateBadge(task)}</td>
                    <td class="text-right nowrap"><button class="btn btn-orange btn-sm" onclick="openManagerAction('${task.orderId}')"><i class="fa-solid fa-user-tie"></i> Xử lý</button></td>
                </tr>`).join('')
            : '<tr><td colspan="8" class="empty-row"><i class="fa-solid fa-circle-check"></i> Hệ thống đã tự xử lý hết, không có đơn nào cần manager</td></tr>';
    } else {
        head.innerHTML = '<tr><th>Thời điểm</th><th>Mã Đơn hàng</th><th>Bước</th><th>Từ</th><th>Sang</th><th>Lý do</th></tr>';
        body.innerHTML = log.length
            ? log.map(h => `
                <tr>
                    <td class="nowrap">${formatDeadline(h.time)}</td>
                    <td class="font-semibold nowrap" style="color: #ea580c;">${h.task.orderId}</td>
                    <td>${STEP_LABEL[h.task.step]}</td>
                    <td>${findStaff(h.fromId).name}</td>
                    <td class="font-semibold">${findStaff(h.toId).name}</td>
                    <td><span class="badge ${h.reason === 'Trễ hạn' ? 'badge-danger' : 'badge-warning'}">${h.reason}</span></td>
                </tr>`).join('')
            : '<tr><td colspan="6" class="empty-row">Chưa có lần chuyển nào</td></tr>';
    }
}

function renderStaffTable() {
    ['inspector', 'coordinator'].forEach(role => {
        document.getElementById('count-' + role).textContent = staff.filter(s => s.role === role).length;
    });

    document.getElementById('staff-table-body').innerHTML = staff.filter(s => s.role === currentTab).map(s => {
        const status = s.status === 'working'
            ? '<span class="badge badge-success">Đang làm việc</span>'
            : `<span class="badge badge-warning">Nghỉ đến ${formatDate(s.offTo)}</span><div class="route-border">Lý do: ${s.offReason}</div>`;
        const leaveButton = s.status === 'working'
            ? `<button class="btn btn-light btn-sm" onclick="openLeave('${s.id}')"><i class="fa-solid fa-user-clock"></i> Báo nghỉ</button>`
            : `<button class="btn btn-light btn-sm" onclick="markBack('${s.id}')"><i class="fa-solid fa-user-check"></i> Đi làm lại</button>`;
        return `
            <tr>
                <td class="text-muted nowrap">${s.id}</td>
                <td class="font-semibold nowrap">${s.name}</td>
                <td class="text-muted nowrap">${s.phone}</td>
                <td>${status}</td>
                <td>${tasksOf(s.id).length}</td>
                <td>${s.kpi.late ? `<span class="text-red">${s.kpi.late}</span>` : 0}</td>
                <td>${s.kpi.transferredOut}</td>
                <td class="text-right nowrap">
                    <button class="btn btn-light btn-sm" onclick="openStaffTasks('${s.id}')"><i class="fa-solid fa-list"></i> Xem đơn</button>
                    ${leaveButton}
                </td>
            </tr>`;
    }).join('');
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.staff-tab').forEach(t => t.classList.toggle('active-tab', t.getAttribute('data-tab') === tab));
    renderStaffTable();
}

function switchIssueTab(code) {
    currentIssue = code;
    document.querySelectorAll('.issue-tab').forEach(t => t.classList.toggle('active-tab', t.getAttribute('data-issue') === code));
    renderIssueTable();
}

// ===== Modal =====
function openModal(title, subtitle, body, actions) {
    document.getElementById('m-title').innerHTML = title;
    document.getElementById('m-subtitle').innerHTML = subtitle;
    document.getElementById('m-body').innerHTML = body;
    document.getElementById('m-actions').innerHTML = actions;
    document.getElementById('staffModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('staffModal').style.display = 'none';
}

function taskSummary(task) {
    const assignee = findStaff(task.assignee);
    const history = task.history.length
        ? `<div class="history-box"><div class="action-label">Lịch sử chuyển người</div>${task.history.map(h =>
            `<div class="history-item">${formatTime(h.time)} · ${findStaff(h.fromId).name} → ${findStaff(h.toId).name} · ${h.reason}${h.auto ? ' (tự động)' : ''}</div>`).join('')}</div>`
        : '';
    return `
        <div class="approval-section">
            <div class="info-grid">
                <div class="info-item"><span class="info-label">Bước đang xử lý</span><span class="info-value">${STEP_LABEL[task.step]}</span></div>
                <div class="info-item"><span class="info-label">Người phụ trách</span><span class="info-value">${assignee.name} (${assignee.id})</span></div>
                <div class="info-item"><span class="info-label">Nhận việc lúc</span><span class="info-value">${formatDeadline(task.assignedAt)}</span></div>
                <div class="info-item"><span class="info-label">Ngày khởi hành</span><span class="info-value">${formatDate(task.departure)}</span></div>
                <div class="info-item"><span class="info-label">Hạn xử lý hiện tại</span><span class="info-value">${deadlineCell(task)}</span></div>
                <div class="info-item"><span class="info-label">Tình trạng</span><span class="info-value">${stateBadge(task)}</span></div>
            </div>
            ${history}
        </div>`;
}

// Xem đơn của một nhân viên
function openStaffTasks(staffId) {
    const s = findStaff(staffId);
    const own = tasksOf(staffId).sort((a, b) => a.departure - b.departure);
    const rows = own.length
        ? own.map(task => `
            <tr>
                <td class="font-semibold nowrap" style="color: #ea580c;">${task.orderId}</td>
                <td>${task.customer}<div class="route-border">${task.route} · KH ${formatDate(task.departure)}</div></td>
                <td class="nowrap">${deadlineCell(task)}</td>
                <td>${stateBadge(task)}</td>
            </tr>`).join('')
        : '<tr><td colspan="4" class="empty-row">Không có đơn đang xử lý</td></tr>';
    openModal(
        s.name,
        `${ROLE_LABEL[s.role]} · ${s.id} · ${own.length} đơn đang xử lý`,
        `<div class="table-responsive"><table class="data-table"><thead><tr><th>Mã đơn</th><th>Khách hàng / Tuyến</th><th>Hạn xử lý</th><th>Tình trạng</th></tr></thead><tbody>${rows}</tbody></table></div>`,
        ''
    );
}

// Manager xử lý: xét lần lượt 3 phương án
let activeTask = null;

function specialExtensionOption(task) {
    const assignee = findStaff(task.assignee);
    const cap = capDeadline(task);
    // Người phụ trách nghỉ: chờ đi làm lại rồi tính đủ số ngày làm việc của bước
    const newDeadline = assignee.status === 'off'
        ? atHour(shiftWorkingDays(assignee.offTo, SLA_WORKING_DAYS[task.step]), WORK_END_HOUR)
        : cap;
    const label = assignee.status === 'off'
        ? `Chờ ${assignee.name} đi làm lại (nghỉ đến ${formatDate(assignee.offTo)}), hạn mới ${formatDeadline(newDeadline)}`
        : `Giữ ${assignee.name}, gia hạn đặc biệt đến mốc chót ${formatDeadline(cap)}`;
    const ok = newDeadline <= cap && Date.now() < cap && !task.specialDeadline;
    const why = task.specialDeadline ? 'Đơn đã được gia hạn đặc biệt 1 lần' : `Không kịp mốc chót ${formatDeadline(cap)}`;
    return { ok, newDeadline, label, why: ok ? '' : why };
}

function openManagerAction(orderId) {
    const task = tasks.find(t => t.orderId === orderId);
    activeTask = task;
    const opt1 = specialExtensionOption(task);
    const minDate = dayKey(new Date(daysFromToday(MIN_LEAD_DAYS)));
    const pending = task.reschedule;
    openModal(
        'Manager xử lý đơn',
        `${task.orderId} · ${task.customer} · ${task.route}`,
        `
        ${taskSummary(task)}
        <div class="status-banner banner-danger" style="margin-top: 16px;"><i class="fa-solid fa-circle-xmark"></i><span>Hệ thống không tự chuyển được: ${stateOf(task).cause}. Xét lần lượt các phương án dưới đây.</span></div>
        <div class="option-list">
            <label class="option-item ${opt1.ok ? '' : 'option-disabled'}">
                <input type="radio" name="fallback" value="extend" ${opt1.ok ? 'checked' : 'disabled'} onchange="toggleFallback()">
                <div><b>1. Gia hạn đặc biệt</b><div class="option-desc">${opt1.label}</div>${opt1.ok ? '' : `<div class="option-why"><i class="fa-solid fa-lock"></i> ${opt1.why}</div>`}</div>
            </label>
            <label class="option-item ${pending ? 'option-disabled' : ''}">
                <input type="radio" name="fallback" value="reschedule" ${pending ? 'disabled' : (opt1.ok ? '' : 'checked')} onchange="toggleFallback()">
                <div><b>2. Đề nghị khách dời ngày khởi hành</b><div class="option-desc">Gửi đề nghị cho khách; khách xác nhận trên cổng khách hàng. Ngày mới ≥ ${formatDate(daysFromToday(MIN_LEAD_DAYS))}.</div>
                ${pending ? `<div class="option-why"><i class="fa-solid fa-lock"></i> Đã gửi đề nghị dời đến ${formatDate(pending.newDate)} lúc ${formatTime(pending.sentAt)}, đang chờ khách phản hồi</div>` : ''}</div>
            </label>
            <label class="option-item">
                <input type="radio" name="fallback" value="reject" ${!opt1.ok && pending ? 'checked' : ''} onchange="toggleFallback()">
                <div><b>3. Từ chối đơn</b><div class="option-desc">Lý do: "Không đủ nhân sự xử lý kịp". Khách chưa thanh toán nên không phát sinh hoàn tiền; chỗ xe giữ tạm được nhả.</div></div>
            </label>
        </div>
        <div id="fallback-box" class="action-box action-box-neutral">
            <div id="reschedule-field" style="display: none;">
                <label class="action-label">Ngày khởi hành đề nghị <span class="required">*</span></label>
                <input id="reschedule-date" type="date" class="action-input" min="${minDate}">
            </div>
            <label class="action-label" style="margin-top: 10px;">Ghi chú <span class="required">*</span></label>
            <textarea id="fallback-note" class="action-input" rows="2" placeholder="Nhập ghi chú..."></textarea>
        </div>`,
        '<button class="btn btn-orange" onclick="confirmFallback()"><i class="fa-solid fa-check"></i> Xác nhận</button>'
    );
    toggleFallback();
}

function toggleFallback() {
    const selected = document.querySelector('input[name="fallback"]:checked');
    document.getElementById('reschedule-field').style.display = selected && selected.value === 'reschedule' ? 'block' : 'none';
}

function confirmFallback() {
    const selected = document.querySelector('input[name="fallback"]:checked');
    const note = document.getElementById('fallback-note');
    const date = document.getElementById('reschedule-date');
    if (!selected) return;
    if (selected.value === 'reschedule' && !date.value) {
        shake('fallback-box', date);
        return;
    }
    if (!note.value.trim()) {
        shake('fallback-box', note);
        return;
    }

    if (selected.value === 'extend') {
        activeTask.specialDeadline = specialExtensionOption(activeTask).newDeadline;
        showToast(`Đã gia hạn đặc biệt ${activeTask.orderId} đến ${formatDeadline(activeTask.specialDeadline)}`, 'success');
    } else if (selected.value === 'reschedule') {
        const [y, m, d] = date.value.split('-').map(Number);
        activeTask.reschedule = { newDate: new Date(y, m - 1, d).getTime(), sentAt: Date.now(), note: note.value.trim() };
        showToast(`Đã gửi đề nghị dời ngày khởi hành ${activeTask.orderId} đến ${formatDate(activeTask.reschedule.newDate)} cho khách`, 'success');
    } else {
        tasks.splice(tasks.indexOf(activeTask), 1);
        showToast(`Đã từ chối đơn ${activeTask.orderId}: Không đủ nhân sự xử lý kịp. Đã thông báo khách hàng`, 'error');
    }
    closeModal();
    renderAll();
}

// Báo nghỉ
let leaveStaff = null;

function openLeave(staffId) {
    leaveStaff = findStaff(staffId);
    const own = tasksOf(staffId);
    // Phòng ngừa: báo nghỉ khiến vai trò không còn ai đang làm việc
    const othersWorking = staff.filter(s => s.role === leaveStaff.role && s.status === 'working' && s.id !== staffId);
    const roleTasks = tasks.filter(t => t.step === leaveStaff.role);
    const warning = othersWorking.length ? '' : `
        <div class="status-banner banner-danger"><i class="fa-solid fa-triangle-exclamation"></i><span>
            Sau khi báo nghỉ sẽ <b>không còn ${ROLE_LABEL[leaveStaff.role].toLowerCase()} nào đang làm việc</b>.
            ${roleTasks.length} đơn ở bước ${STEP_LABEL[leaveStaff.role]} sẽ không tự chuyển được và cần manager xử lý (${roleTasks.map(t => t.orderId).join(', ')}),
            và trang Tiếp nhận sẽ khóa nút tiếp nhận đơn mới.
        </span></div>
        <label class="confirm-check"><input type="checkbox" id="leave-confirm"> Tôi đã hiểu và vẫn ghi nhận nghỉ</label>`;
    openModal(
        'Báo nghỉ',
        `${leaveStaff.name} · ${ROLE_LABEL[leaveStaff.role]} · ${leaveStaff.id}`,
        `
        ${warning}
        <div id="leave-box" class="action-box action-box-neutral">
            <label class="action-label">Nghỉ đến hết ngày <span class="required">*</span></label>
            <input id="leave-to" type="date" class="action-input" min="${dayKey(today)}">
            <label class="action-label" style="margin-top: 10px;">Lý do <span class="required">*</span></label>
            <select id="leave-reason" class="action-input">
                <option>Ốm</option>
                <option>Việc gia đình</option>
                <option>Khác</option>
            </select>
            <p class="action-hint"><i class="fa-solid fa-circle-info"></i> Trong thời gian nghỉ, nhân viên không được gợi ý nhận đơn mới. ${own.length} đơn đang xử lý sẽ được hệ thống tự chuyển cho người khác.</p>
        </div>`,
        '<button class="btn btn-orange" onclick="confirmLeave()"><i class="fa-solid fa-user-clock"></i> Xác nhận báo nghỉ</button>'
    );
}

function confirmLeave() {
    const input = document.getElementById('leave-to');
    const check = document.getElementById('leave-confirm');
    if (!input.value) {
        shake('leave-box', input);
        return;
    }
    if (check && !check.checked) {
        shake('leave-box', check);
        return;
    }
    const [y, m, d] = input.value.split('-').map(Number);
    leaveStaff.status = 'off';
    leaveStaff.offTo = new Date(y, m - 1, d, 23, 59).getTime();
    leaveStaff.offReason = document.getElementById('leave-reason').value;
    closeModal();
    const moved = renderAll();
    showToast(`Đã ghi nhận ${leaveStaff.name} nghỉ đến ${formatDate(leaveStaff.offTo)}. Tự động chuyển ${moved.length} đơn`, 'success');
}

function markBack(staffId) {
    const s = findStaff(staffId);
    s.status = 'working';
    delete s.offTo;
    delete s.offReason;
    const moved = renderAll();
    showToast(`${s.name} đã đi làm lại${moved.length ? `. Tự động chuyển ${moved.length} đơn` : ''}`, 'success');
}

// ===== Tiện ích =====
function shake(boxId, input) {
    const box = document.getElementById(boxId);
    box.style.animation = 'none';
    box.offsetHeight;
    box.style.animation = 'shake 0.4s ease';
    input.classList.add('input-error');
    input.focus();
}

function showToast(message, type) {
    const toast = document.createElement('div');
    const colors = { success: '#16a34a', error: '#dc2626' };
    const icons = { success: '✓', error: '✕' };
    toast.innerHTML = '<span style="margin-right: 8px; font-weight: bold;">' + icons[type] + '</span>' + message;
    toast.style.cssText = 'position: fixed; top: 24px; right: 24px; background: ' + colors[type] + '; color: white; padding: 14px 20px; border-radius: 8px; font-family: Inter; font-size: 0.9rem; font-weight: 500; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease, fadeOut 0.4s ease 2.6s forwards;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

renderAll();
