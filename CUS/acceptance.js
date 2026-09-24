// ===== Quy tắc nghiệm thu =====
// - Sau khi giao ngựa, khách có ACCEPTANCE_HOURS giờ để xác nhận nghiệm thu hoặc báo vấn đề.
// - Hết thời hạn mà khách không phản hồi: hệ thống tự động nghiệm thu, đơn chuyển sang Hoàn thành.
// - Khách báo vấn đề: tạm dừng tự động nghiệm thu; Quản lý liên hệ trong ISSUE_RESPONSE_HOURS giờ.
// - Khách đã thanh toán 100% trước chuyến đi: nghiệm thu không phát sinh thanh toán.
const ACCEPTANCE_HOURS = 24;
const ISSUE_RESPONSE_HOURS = 4;
const HOTLINE = '1900 6868';
const HOUR = 60 * 60 * 1000;

const ISSUE_TYPES = ['Ngựa bị thương / trầy xước', 'Chỉ số sức khỏe bất thường', 'Thiếu hoặc sai giấy tờ', 'Giao nhầm ngựa', 'Khác'];

// Ngưỡng tham khảo cho ngựa trưởng thành khi nghỉ
const NORMAL_RANGE = { temp: [37.5, 38.5], heart: [28, 44] };

const DOCS_DOMESTIC = ['Hộ chiếu ngựa (bản gốc)', 'Giấy chứng nhận kiểm dịch vận chuyển nội địa'];
const DOCS_CROSS_BORDER = ['Hộ chiếu ngựa (bản gốc)', 'Giấy chứng nhận kiểm dịch xuất / nhập khẩu', 'Tờ khai hải quan cửa khẩu'];

// ===== Dữ liệu mẫu (khớp với trang Đơn của tôi) =====
// status: delivered (đã giao, chờ nghiệm thu) | disputed (đang xử lý báo cáo) | completed
const now = Date.now();
const orders = [
    {
        id: 'EQ-2026-1019', customerEmail: 'longthanh.farm@gmail.com',
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Đại Nam (Bình Dương, VN)', border: null,
        horse: 'Storm Runner', chip: 'VN-985211', total: 5600000, paidAt: now - 6 * 24 * HOUR,
        vehicle: 'Xe chuyên dụng 2 ngăn · 51C-123.45', driver: 'Nguyễn Văn Hùng', groom: 'Võ Thị Lan', inspector: 'Phạm Văn Hưng',
        pickup: { time: now - 6 * HOUR, temp: 37.6, heart: 34, eat: 'Bình thường', body: 'Không chấn thương' },
        delivery: { time: now - 3 * HOUR, temp: 37.9, heart: 38, eat: 'Bình thường', body: 'Không chấn thương' },
        status: 'delivered', deliveredAt: now - 3 * HOUR
    },
    {
        id: 'EQ-2026-1021', customerEmail: 'longthanh.farm@gmail.com',
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phú Thọ (TP.HCM, VN)', border: null,
        horse: 'Storm Runner', chip: 'VN-985211', total: 5100000, paidAt: now - 19 * 24 * HOUR,
        vehicle: 'Xe chuyên dụng 2 ngăn · 51C-123.45', driver: 'Nguyễn Văn Hùng', groom: 'Đỗ Văn Nam', inspector: 'Nguyễn Thị Thu',
        pickup: { time: now - 6 * 24 * HOUR - 5 * HOUR, temp: 37.5, heart: 32, eat: 'Bình thường', body: 'Không chấn thương' },
        delivery: { time: now - 6 * 24 * HOUR - 3 * HOUR, temp: 37.7, heart: 36, eat: 'Bình thường', body: 'Không chấn thương' },
        status: 'completed', deliveredAt: now - 6 * 24 * HOUR - 3 * HOUR, acceptedAt: now - 6 * 24 * HOUR - 2 * HOUR, acceptedBy: 'customer'
    }
];

// ===== Tiện ích =====
const pad = n => String(n).padStart(2, '0');
const formatVND = n => n.toLocaleString('en-US') + ' ₫';
const formatTime = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const acceptanceDeadline = order => order.deliveredAt + ACCEPTANCE_HOURS * HOUR;

function infoRow(label, value) {
    return `<div class="info-row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function timeLeftText(t) {
    const ms = Math.max(0, t - Date.now());
    return `${Math.floor(ms / HOUR)} giờ ${pad(Math.floor((ms % HOUR) / 60000))} phút`;
}

// Hết hạn mà chưa phản hồi → tự động nghiệm thu
function autoAccept() {
    orders.forEach(order => {
        if (order.status === 'delivered' && Date.now() > acceptanceDeadline(order)) {
            order.status = 'completed';
            order.acceptedAt = acceptanceDeadline(order);
            order.acceptedBy = 'auto';
        }
    });
}

// ===== Render =====
let order = null;

function render() {
    autoAccept();
    const id = new URLSearchParams(location.search).get('id');
    order = id ? orders.find(o => o.id === id) : orders.find(o => o.status === 'delivered' || o.status === 'disputed');

    if (!order) {
        document.getElementById('a-content').style.display = 'none';
        document.getElementById('a-empty').style.display = 'block';
        document.getElementById('a-empty').innerHTML = `
            <div class="alert-box alert-info"><i class="fa-solid fa-circle-info" style="margin-top: 3px;"></i>
                <div>Hiện không có đơn nào chờ nghiệm thu. Đơn sẽ xuất hiện ở đây khi ngựa được giao tới điểm đến.
                <a href="don_cua_toi.html" class="text-orange font-semibold">Xem Đơn của tôi →</a></div></div>`;
        return;
    }

    document.getElementById('a-empty').style.display = 'none';
    document.getElementById('a-content').style.display = 'block';
    document.getElementById('a-title').textContent = `Nghiệm thu đơn ${order.id}`;
    document.querySelectorAll('.m-order').forEach(el => { el.textContent = order.id; });

    const badges = {
        delivered: `<span class="badge badge-warning"><i class="fa-regular fa-clock"></i> Chờ bạn nghiệm thu · còn ${timeLeftText(acceptanceDeadline(order))}</span>`,
        disputed: '<span class="badge badge-danger"><i class="fa-solid fa-flag"></i> Đang xử lý báo cáo</span>',
        completed: `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Đã nghiệm thu · ${formatTime(order.acceptedAt)}</span>`
    };
    document.getElementById('a-badge').innerHTML = badges[order.status];

    const banners = {
        delivered: ['alert-info', 'fa-circle-info', `Ngựa đã được giao lúc <strong>${formatTime(order.deliveredAt)}</strong>. Vui lòng kiểm tra và xác nhận nghiệm thu trước <strong>${formatTime(acceptanceDeadline(order))}</strong>. Nếu có vấn đề, hãy báo ngay trong thời hạn này. Quá hạn không phản hồi, hệ thống sẽ tự động nghiệm thu.`],
        disputed: order.issue ? ['alert-warning', 'fa-flag', `<strong>Đã gửi báo cáo lúc ${formatTime(order.issue.time)}</strong>: ${order.issue.type} — ${order.issue.note.replace(/[.\s]+$/, '')}${order.issue.files.length ? ` (${order.issue.files.length} tệp đính kèm)` : ''}.<br>
            Quản lý sẽ liên hệ với bạn trước <strong>${formatTime(order.issue.time + ISSUE_RESPONSE_HOURS * HOUR)}</strong>. Tự động nghiệm thu đang tạm dừng cho tới khi báo cáo được xử lý.`] : null,
        completed: ['alert-info', 'fa-file-signature', order.acceptedBy === 'auto'
            ? `Đơn được <strong>tự động nghiệm thu</strong> lúc ${formatTime(order.acceptedAt)} do không có phản hồi trong ${ACCEPTANCE_HOURS} giờ sau khi giao. Biên bản nghiệm thu điện tử đã gửi tới ${order.customerEmail}.`
            : `Bạn đã xác nhận nghiệm thu lúc <strong>${formatTime(order.acceptedAt)}</strong>. Biên bản nghiệm thu điện tử đã gửi tới ${order.customerEmail}.`]
    };
    const banner = banners[order.status];
    document.getElementById('a-banner').innerHTML = banner
        ? `<div class="alert-box ${banner[0]}"><i class="fa-solid ${banner[1]}" style="margin-top: 3px;"></i><div>${banner[2]}</div></div>`
        : '';

    // Thông tin bàn giao
    document.getElementById('a-info').innerHTML =
        infoRow('Mã đơn', `<span class="text-orange">${order.id}</span>`) +
        infoRow('Ngựa bàn giao', `${order.horse} (Microchip #${order.chip})`) +
        infoRow('Điểm đi', order.from) +
        infoRow('Điểm đến (nơi bàn giao)', order.to) +
        infoRow('Thời điểm giao', formatTime(order.deliveredAt)) +
        infoRow('Xe', order.vehicle) +
        infoRow('Người bàn giao', `${order.groom} (NV chăm sóc) · ${order.driver} (tài xế)`);

    // Sức khỏe: lúc nhận (kiểm dịch viên) so với lúc giao (NV chăm sóc)
    const inRange = (v, [min, max]) => v >= min && v <= max;
    const verdict = ok => ok ? '<span class="badge badge-success">Bình thường</span>' : '<span class="badge badge-danger">Bất thường</span>';
    const p = order.pickup;
    const d = order.delivery;
    document.getElementById('a-health').innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Chỉ số</th>
                    <th>Lúc nhận<div class="sub-text">${order.inspector} (kiểm dịch viên) · ${formatTime(p.time)}</div></th>
                    <th>Lúc giao<div class="sub-text">${order.groom} (NV chăm sóc) · ${formatTime(d.time)}</div></th>
                    <th>Đánh giá lúc giao</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Thân nhiệt <div class="sub-text">Tham khảo ${NORMAL_RANGE.temp[0]}–${NORMAL_RANGE.temp[1]}°C</div></td><td>${p.temp}°C</td><td class="font-semibold">${d.temp}°C</td><td>${verdict(inRange(d.temp, NORMAL_RANGE.temp))}</td></tr>
                <tr><td>Nhịp tim <div class="sub-text">Tham khảo ${NORMAL_RANGE.heart[0]}–${NORMAL_RANGE.heart[1]} bpm</div></td><td>${p.heart} bpm</td><td class="font-semibold">${d.heart} bpm</td><td>${verdict(inRange(d.heart, NORMAL_RANGE.heart))}</td></tr>
                <tr><td>Ăn uống</td><td>${p.eat}</td><td class="font-semibold">${d.eat}</td><td>${verdict(d.eat === 'Bình thường')}</td></tr>
                <tr><td>Thể trạng</td><td>${p.body}</td><td class="font-semibold">${d.body}</td><td>${verdict(d.body === 'Không chấn thương')}</td></tr>
            </tbody>
        </table>`;

    // Hình ảnh & tiêu chuẩn bàn giao
    document.getElementById('a-photo-time').textContent = `Chụp lúc ${formatTime(order.deliveredAt - 5 * 60000)}`;
    document.getElementById('a-photos').innerHTML = `
        <div class="image-box">
            <img src="https://images.unsplash.com/photo-1598974357801-cbca100e65d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60" alt="Bàn giao tại cửa khoang chuồng">
            <p class="font-semibold">1. Bàn giao tại cửa khoang chuồng</p>
        </div>
        <div class="image-box">
            <img src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60" alt="Thể trạng ngựa ${order.horse}">
            <p class="font-semibold">2. Thể trạng ngựa ${order.horse}</p>
        </div>`;
    const docs = order.border ? DOCS_CROSS_BORDER : DOCS_DOMESTIC;
    document.getElementById('a-checklist').innerHTML = [
        `<strong>Đúng ngựa:</strong> microchip #${order.chip} khớp với hộ chiếu`,
        '<strong>Thể trạng:</strong> không chấn thương xương khớp, không trầy xước',
        '<strong>Chỉ số sức khỏe:</strong> trong ngưỡng bình thường',
        `<strong>Giấy tờ bàn giao:</strong> ${docs.join(', ')}`
    ].map(text => `<div class="check-item"><div class="check-icon"><i class="fa-solid fa-check"></i></div><span>${text}</span></div>`).join('');

    document.getElementById('a-side').innerHTML = sidePanel();
}

function sidePanel() {
    const payment = `
        <div class="card">
            <div class="card-header"><h3><i class="fa-solid fa-receipt text-orange"></i> Thanh toán</h3></div>
            <div class="card-body">
                ${infoRow('Tổng giá trị đơn', formatVND(order.total))}
                ${infoRow('Đã thanh toán (100%)', `<span style="color: #059669;">${formatVND(order.total)}</span>`)}
                ${infoRow('Thanh toán lúc', formatTime(order.paidAt))}
                <p class="side-hint">Đơn đã thanh toán đủ trước chuyến đi. Nghiệm thu không phát sinh thêm chi phí.</p>
            </div>
        </div>`;

    if (order.status === 'completed') {
        return `${payment}
            <a href="don_cua_toi.html" class="btn btn-light-outline btn-full"><i class="fa-solid fa-arrow-left"></i> Về Đơn của tôi</a>`;
    }

    const actions = `
        <div class="card">
            <div class="card-header"><h3><i class="fa-solid fa-signature text-orange"></i> Xác nhận</h3></div>
            <div class="card-body">
                ${order.status === 'delivered' ? `
                    <div class="deadline-box">
                        <div><i class="fa-regular fa-clock"></i> Còn <strong>${timeLeftText(acceptanceDeadline(order))}</strong></div>
                        <div class="deadline-sub">Tự động nghiệm thu lúc ${formatTime(acceptanceDeadline(order))}</div>
                    </div>` : ''}
                <button class="btn btn-primary btn-full" onclick="openModal('acceptModal')"><i class="fa-solid fa-signature"></i> Xác nhận nghiệm thu</button>
                ${order.status === 'delivered'
                    ? '<button class="btn btn-light-outline btn-full" style="margin-top: 8px;" onclick="openIssue()"><i class="fa-solid fa-flag"></i> Báo vấn đề</button>'
                    : `<p class="side-hint">Cần hỗ trợ thêm về báo cáo, vui lòng liên hệ hotline <strong>${HOTLINE}</strong>.</p>`}
            </div>
        </div>`;
    return actions + payment;
}

// ===== Hành động =====
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function confirmAccept() {
    order.status = 'completed';
    order.acceptedAt = Date.now();
    order.acceptedBy = 'customer';
    closeModal('acceptModal');
    showToast(`Đã nghiệm thu đơn ${order.id}. Biên bản đã gửi tới ${order.customerEmail}.`);
    render();
}

function openIssue() {
    document.getElementById('issue-type').innerHTML = ISSUE_TYPES.map(t => `<option>${t}</option>`).join('');
    document.getElementById('issue-note').value = '';
    document.getElementById('issue-note').classList.remove('input-error');
    document.getElementById('issue-files').value = '';
    document.getElementById('issue-hint').textContent = `Quản lý sẽ liên hệ trong ${ISSUE_RESPONSE_HOURS} giờ. Trong lúc xử lý, tự động nghiệm thu được tạm dừng.`;
    openModal('issueModal');
}

function confirmIssue() {
    const note = document.getElementById('issue-note');
    if (!note.value.trim()) {
        note.classList.add('input-error');
        note.focus();
        return;
    }
    order.status = 'disputed';
    order.issue = {
        time: Date.now(),
        type: document.getElementById('issue-type').value,
        note: note.value.trim(),
        files: [...document.getElementById('issue-files').files].map(f => f.name)
    };
    closeModal('issueModal');
    showToast(`Đã gửi báo cáo cho đơn ${order.id}. Quản lý sẽ liên hệ trong ${ISSUE_RESPONSE_HOURS} giờ.`);
    render();
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.innerHTML = `<i class="fa-solid fa-check"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

render();
