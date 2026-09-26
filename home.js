// ===== Trang chủ công khai =====
// Tra cứu đơn (không cần đăng nhập): mã đơn + 4 số cuối SĐT người đặt; chỉ hiện tiến trình, tuyến, ngày,
// không hiện tên khách, giá hay giấy tờ.
// Tra cứu cước: giá THAM KHẢO theo bảng giá dưới đây; giá chính thức nằm trên đơn sau khi gửi.

// ===== Bảng giá =====
const TRIP_OPEN_FEE = 3000000;                 // phí mở chuyến, mỗi xe
const KM_TIERS = [[300, 26000], [600, 20000], [Infinity, 15000]]; // [đến km, ₫/km], mỗi xe 2 ngăn
const BIG_TRUCK_FACTOR = 1.4;                  // xe 4 ngăn
const QUARANTINE_FEE = { domestic: 900000, border: 3800000 }; // mỗi ngựa
const CARE_FEE_PER_DAY = 800000;               // mỗi ngựa, mỗi ngày
const INSURANCE_RATE = { basic: 0.02, full: 0.05 };           // theo giá trị ngựa khai báo
const MAX_HORSES = 8;
const MAX_TRACK_CODES = 5;
const ROAD_FACTOR = 1.35;                      // đường bộ dài hơn đường chim bay
const AVG_SPEED_KMH = 50;
const BORDER_HOURS = 3;
const DRIVE_HOURS_PER_DAY = 10;
const MIN_LEAD_DAYS = 10;

// ===== Mạng lưới =====
const COUNTRIES = {
    VN: { name: 'Việt Nam', meta: 'Nội địa & xuất phát' },
    LA: { name: 'Lào', meta: 'Qua 3 cửa khẩu' },
    KH: { name: 'Campuchia', meta: 'Qua 2 cửa khẩu' }
};

const PLACES = [
    { id: 'hn', name: 'Hà Nội', country: 'VN', lat: 21.03, lng: 105.85 },
    { id: 'dn', name: 'Đà Nẵng', country: 'VN', lat: 16.05, lng: 108.2 },
    { id: 'qn', name: 'Quy Nhơn (Bình Định)', country: 'VN', lat: 13.78, lng: 109.22 },
    { id: 'hcm', name: 'TP. Hồ Chí Minh', country: 'VN', lat: 10.77, lng: 106.66 },
    { id: 'dni', name: 'Đồng Nai', country: 'VN', lat: 10.78, lng: 106.95 },
    { id: 'bd', name: 'Bình Dương', country: 'VN', lat: 11.0, lng: 106.65 },
    { id: 'tn', name: 'Tây Ninh', country: 'VN', lat: 11.31, lng: 106.1 },
    { id: 'ct', name: 'Cần Thơ', country: 'VN', lat: 10.03, lng: 105.78 },
    { id: 'vte', name: 'Vientiane', country: 'LA', lat: 17.97, lng: 102.6 },
    { id: 'svk', name: 'Savannakhet', country: 'LA', lat: 16.57, lng: 104.75 },
    { id: 'lpb', name: 'Luang Prabang', country: 'LA', lat: 19.89, lng: 102.13 },
    { id: 'pks', name: 'Pakse', country: 'LA', lat: 15.12, lng: 105.8 },
    { id: 'pnh', name: 'Phnom Penh', country: 'KH', lat: 11.56, lng: 104.92 },
    { id: 'rep', name: 'Siem Reap', country: 'KH', lat: 13.36, lng: 103.86 },
    { id: 'btb', name: 'Battambang', country: 'KH', lat: 13.1, lng: 103.2 },
    { id: 'kos', name: 'Sihanoukville', country: 'KH', lat: 10.63, lng: 103.5 }
];

// Cửa khẩu đường bộ: tọa độ phía Việt Nam
const GATES = [
    { name: 'Mộc Bài – Bavet', country: 'KH', lat: 11.07, lng: 106.2 },
    { name: 'Tịnh Biên – Phnom Den', country: 'KH', lat: 10.6, lng: 104.95 },
    { name: 'Lao Bảo – Densavanh', country: 'LA', lat: 16.62, lng: 106.6 },
    { name: 'Cầu Treo – Nam Phao', country: 'LA', lat: 18.38, lng: 105.13 },
    { name: 'Tây Trang – Sop Hun', country: 'LA', lat: 21.23, lng: 102.95 }
];

// ===== Dữ liệu mẫu tra cứu đơn (khớp trang Đơn của tôi) =====
const STEPS = ['Gửi đơn', 'Thẩm định', 'Thanh toán', 'Vận chuyển', 'Nghiệm thu'];
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const today = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

// step: bước đang ở (0–4); done = true khi đã xong toàn bộ; tone: màu nhãn trạng thái
const TRACK_ORDERS = {
    'EQ-2026-1028': { phone: '3456', route: 'Đồng Nai → Phnom Penh (Campuchia)', depart: today, step: 3, status: 'Đang vận chuyển',
        now: { place: 'Cửa khẩu Bavet (Campuchia) — kiểm tra thú y nhập cảnh', at: Date.now() - 10 * 60000, eta: Date.now() + 3 * HOUR } },
    'EQ-2026-1030': { phone: '3456', route: 'Đồng Nai → Đà Nẵng', depart: today + 6 * DAY, step: 3, status: 'Đã thanh toán · chờ khởi hành' },
    'EQ-2026-1074': { phone: '3456', route: 'Đồng Nai → Siem Reap (Campuchia)', depart: today + 14 * DAY, step: 1, status: 'Cần người đặt phản hồi', tone: 'warn',
        note: 'Hồ sơ cần người đặt chọn phương án xử lý. Vui lòng đăng nhập để xem chi tiết.' },
    'EQ-2026-1019': { phone: '3456', route: 'Đồng Nai → Bình Dương', depart: today, step: 4, status: 'Đã giao · chờ nghiệm thu' },
    'EQ-2026-1021': { phone: '3456', route: 'Đồng Nai → TP.HCM', depart: today - 6 * DAY, step: 4, done: true, status: 'Hoàn thành', tone: 'done' }
};

// ===== Tiện ích =====
const pad = n => String(n).padStart(2, '0');
const formatDate = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const formatTime = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())} ${formatDate(t)}`; };
const formatVND = n => Math.round(n).toLocaleString('en-US') + ' ₫';

function haversineKm(a, b) {
    const rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const roadKm = km => Math.max(10, Math.round(km * ROAD_FACTOR / 10) * 10);

// ===== Tab tra cứu =====
function openLookup(tab) {
    document.querySelectorAll('.lookup-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.lookup-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
    document.getElementById('site-nav').classList.remove('open');
}

function markError(el, box, message) {
    el.classList.add('input-error');
    el.focus();
    box.innerHTML = `<p class="form-error"><i class="fa-solid fa-circle-exclamation"></i> ${message}</p>`;
}

document.addEventListener('input', e => e.target.classList.remove('input-error'));

// ===== Tra cứu đơn hàng =====
function trackOrders(event) {
    event.preventDefault();
    const box = document.getElementById('track-result');
    const codesInput = document.getElementById('track-codes');
    const phoneInput = document.getElementById('track-phone');
    const codes = [...new Set(codesInput.value.split(',').map(c => c.trim().toUpperCase()).filter(Boolean))];
    const phone = phoneInput.value.trim();

    if (!codes.length) return markError(codesInput, box, 'Nhập ít nhất 1 mã đơn.');
    if (codes.length > MAX_TRACK_CODES) return markError(codesInput, box, `Tối đa ${MAX_TRACK_CODES} mã đơn mỗi lần tra cứu.`);
    if (!/^\d{4}$/.test(phone)) return markError(phoneInput, box, 'Nhập đúng 4 số cuối số điện thoại người đặt.');

    box.innerHTML = `<div class="track-list">${codes.map((code, i) => {
        const order = TRACK_ORDERS[code];
        // Không cho biết đơn có tồn tại hay không khi số điện thoại sai
        if (!order || order.phone !== phone) {
            return `<div class="track-item track-miss" style="animation-delay: ${i * 80}ms"><b>${code}</b>: không tìm thấy đơn, hoặc 4 số cuối điện thoại không khớp.</div>`;
        }
        const steps = STEPS.map((label, s) => {
            const cls = order.done || s < order.step ? 'done' : s === order.step ? 'current' : '';
            return `<div class="track-step ${cls}"><span class="dot">${cls === 'done' ? '<i class="fa-solid fa-check"></i>' : ''}</span><div>${label}</div></div>`;
        }).join('');
        return `
            <div class="track-item" style="animation-delay: ${i * 80}ms">
                <div class="track-head"><span class="track-code">${code}</span><span class="track-status ${order.tone || ''}">${order.status}</span></div>
                <div class="track-meta"><i class="fa-solid fa-route"></i> ${order.route} · Khởi hành ${formatDate(order.depart)}</div>
                <div class="track-steps">${steps}</div>
                ${order.now ? `<div class="track-now"><i class="fa-solid fa-location-dot"></i> <b>${order.now.place}</b><br>Cập nhật lúc ${formatTime(order.now.at)} · Dự kiến giao ${formatTime(order.now.eta)}</div>` : ''}
                ${order.note ? `<div class="track-now"><i class="fa-solid fa-circle-info"></i> ${order.note}</div>` : ''}
            </div>`;
    }).join('')}</div>`;
}

// ===== Tra cứu cước =====
function truckCost(km, big) {
    let left = km, from = 0, cost = TRIP_OPEN_FEE;
    for (const [to, rate] of KM_TIERS) {
        const part = Math.min(left, to - from);
        if (part <= 0) break;
        cost += part * rate;
        left -= part;
        from = to;
    }
    return big ? cost * BIG_TRUCK_FACTOR : cost;
}

// Xe 4 ngăn cho mỗi 4 ngựa; phần dư 1–2 ngựa dùng xe 2 ngăn, 3 ngựa dùng xe 4 ngăn
function trucksFor(horses) {
    const trucks = Array(Math.floor(horses / 4)).fill(true);
    const rest = horses % 4;
    if (rest) trucks.push(rest === 3);
    return trucks;
}

// Tuyến xuyên biên giới: chọn cửa khẩu cho quãng đường ngắn nhất
function routeOf(from, to) {
    if (from.country === 'VN' && to.country === 'VN') {
        return { km: roadKm(haversineKm(from, to)), gate: null };
    }
    const foreign = from.country === 'VN' ? to : from;
    return GATES.filter(g => g.country === foreign.country)
        .map(g => ({ km: roadKm(haversineKm(from, g) + haversineKm(g, to)), gate: g.name }))
        .sort((a, b) => a.km - b.km)[0];
}

function estimateFee(event) {
    event.preventDefault();
    const box = document.getElementById('fee-result');
    const from = PLACES.find(p => p.id === document.getElementById('fee-from').value);
    const to = PLACES.find(p => p.id === document.getElementById('fee-to').value);
    const horsesInput = document.getElementById('fee-horses');
    const valueInput = document.getElementById('fee-value');
    const horses = Number(horsesInput.value);
    const value = Number(valueInput.value.replace(/\D/g, ''));

    if (from.id === to.id) return markError(document.getElementById('fee-to'), box, 'Điểm đến phải khác điểm đi.');
    if (from.country !== 'VN' && to.country !== 'VN') return markError(document.getElementById('fee-to'), box, 'Hiện chỉ nhận tuyến có điểm đi hoặc điểm đến tại Việt Nam.');
    if (!Number.isInteger(horses) || horses < 1 || horses > MAX_HORSES) return markError(horsesInput, box, `Số ngựa từ 1 đến ${MAX_HORSES}. Trên ${MAX_HORSES} con, vui lòng gọi hotline 1900 6868.`);

    const { km, gate } = routeOf(from, to);
    const border = !!gate;
    const hours = km / AVG_SPEED_KMH + (border ? BORDER_HOURS : 0);
    const days = Math.max(1, Math.ceil(hours / DRIVE_HOURS_PER_DAY));
    const trucks = trucksFor(horses);
    const bigCount = trucks.filter(Boolean).length;
    const smallCount = trucks.length - bigCount;
    const truckLabel = [bigCount ? `${bigCount} xe 4 ngăn` : '', smallCount ? `${smallCount} xe 2 ngăn` : ''].filter(Boolean).join(' + ');

    const rows = [
        ['Vận chuyển đường bộ', `${truckLabel} · ${km} km`, trucks.reduce((t, big) => t + truckCost(km, big), 0)],
        [border ? 'Kiểm dịch & thủ tục xuất nhập cảnh' : 'Kiểm dịch vận chuyển nội địa', `${horses} ngựa × ${formatVND(border ? QUARANTINE_FEE.border : QUARANTINE_FEE.domestic)}`, horses * (border ? QUARANTINE_FEE.border : QUARANTINE_FEE.domestic)],
        ['Chăm sóc dọc đường', `${horses} ngựa × ${days} ngày × ${formatVND(CARE_FEE_PER_DAY)}`, horses * days * CARE_FEE_PER_DAY]
    ];
    if (value) rows.push(['Bảo hiểm vận chuyển (gói cơ bản)', `${INSURANCE_RATE.basic * 100}% × giá trị khai báo ${formatVND(value)}`, value * INSURANCE_RATE.basic]);
    const total = rows.reduce((t, r) => t + r[2], 0);

    box.innerHTML = `
        <div class="fee-result">
            <div>
                <div class="fee-route">
                    <span><i class="fa-solid fa-route"></i> <b>${from.name} → ${to.name}</b></span>
                    <span>${border ? `Cửa khẩu <b>${gate}</b>` : 'Nội địa'}</span>
                    <span>Khoảng <b>${km} km</b> · ${hours < DRIVE_HOURS_PER_DAY ? `~${Math.ceil(hours)} giờ` : `${days} ngày`}</span>
                </div>
                <table class="fee-table">
                    ${rows.map(([name, detail, amount]) => `<tr><td>${name}<span class="sub">${detail}</span></td><td>${formatVND(amount)}</td></tr>`).join('')}
                    ${value ? '' : '<tr><td>Bảo hiểm vận chuyển<span class="sub">Nhập giá trị ngựa khai báo để tính (gói cơ bản 2%, toàn diện 5%)</span></td><td>—</td></tr>'}
                </table>
            </div>
            <div class="fee-total">
                <span>Tổng cước tham khảo</span>
                <strong>${formatVND(total)}</strong>
                <small>Giá chính thức hiển thị trên đơn sau khi bạn gửi. Đặt trước tối thiểu ${MIN_LEAD_DAYS} ngày.</small>
                <a href="CUS/login.html" class="btn btn-solid">Đặt chuyến tuyến này</a>
            </div>
        </div>`;
}

// ===== Bảng giá =====
function renderPriceTable() {
    const tiers = KM_TIERS.map(([to, rate], i) => {
        const from = i ? KM_TIERS[i - 1][0] + 1 : 0;
        return `<tr><td>${to === Infinity ? `Từ km ${from}` : `Km ${from} – ${to}`}</td><td>${formatVND(rate)}/km</td></tr>`;
    }).join('');
    document.getElementById('bang-gia').innerHTML = `
        <div class="price-grid">
            <div>
                <h3><i class="fa-solid fa-truck"></i> Cước xe (tính cho mỗi xe 2 ngăn)</h3>
                <table class="price-table">
                    <thead><tr><th>Hạng mục</th><th>Đơn giá</th></tr></thead>
                    <tbody>
                        <tr><td>Phí mở chuyến</td><td>${formatVND(TRIP_OPEN_FEE)}</td></tr>
                        ${tiers}
                        <tr><td>Xe 4 ngăn (3 – 4 ngựa)</td><td>× ${BIG_TRUCK_FACTOR} giá xe 2 ngăn</td></tr>
                    </tbody>
                </table>
            </div>
            <div>
                <h3><i class="fa-solid fa-horse-head"></i> Phí theo ngựa</h3>
                <table class="price-table">
                    <thead><tr><th>Hạng mục</th><th>Đơn giá</th></tr></thead>
                    <tbody>
                        <tr><td>Kiểm dịch vận chuyển nội địa</td><td>${formatVND(QUARANTINE_FEE.domestic)}/ngựa</td></tr>
                        <tr><td>Kiểm dịch & thủ tục xuất nhập cảnh</td><td>${formatVND(QUARANTINE_FEE.border)}/ngựa</td></tr>
                        <tr><td>Chăm sóc dọc đường</td><td>${formatVND(CARE_FEE_PER_DAY)}/ngựa/ngày</td></tr>
                        <tr><td>Bảo hiểm gói cơ bản</td><td>${INSURANCE_RATE.basic * 100}% giá trị khai báo</td></tr>
                        <tr><td>Bảo hiểm gói toàn diện</td><td>${INSURANCE_RATE.full * 100}% giá trị khai báo</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="price-notes">
            <div><i class="fa-solid fa-calendar-check"></i>Đặt trước tối thiểu ${MIN_LEAD_DAYS} ngày so với ngày khởi hành.</div>
            <div><i class="fa-solid fa-earth-asia"></i>Tuyến trong Việt Nam, hoặc giữa Việt Nam với Lào, Campuchia.</div>
            <div><i class="fa-solid fa-receipt"></i>Giá tham khảo. Giá chính thức ghi trên đơn và không thay đổi sau khi duyệt.</div>
        </div>`;
}

// ===== Cờ & mạng lưới =====
const FLAG_SVG = {
    VN: `<svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice"><rect width="30" height="20" fill="#da251d"/><polygon points="15,4 16.18,7.6 19.96,7.6 16.9,9.8 18.07,13.4 15,11.2 11.93,13.4 13.1,9.8 10.04,7.6 13.82,7.6" fill="#ffff00"/></svg>`,
    LA: `<svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice"><rect width="30" height="20" fill="#ce1126"/><rect y="5" width="30" height="10" fill="#002868"/><circle cx="15" cy="10" r="4" fill="#fff"/></svg>`,
    KH: `<svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice"><rect width="30" height="20" fill="#032ea1"/><rect y="5" width="30" height="10" fill="#e00025"/>
        <g fill="#fff" stroke="#000" stroke-width="0.15"><rect x="8.6" y="13" width="12.8" height="1.1"/><rect x="9.6" y="11" width="10.8" height="2"/>
        <polygon points="15,5.6 16.2,8.2 16.2,11 13.8,11 13.8,8.2"/><polygon points="12.2,7.6 13.1,9.3 13.1,11 11.3,11 11.3,9.3"/><polygon points="17.8,7.6 18.7,9.3 18.7,11 16.9,11 16.9,9.3"/>
        <polygon points="10.2,8.9 10.8,10 10.8,11 9.6,11 9.6,10"/><polygon points="19.8,8.9 20.4,10 20.4,11 19.2,11 19.2,10"/></g></svg>`
};

let activeCountry = 'VN';

function renderFlags() {
    document.getElementById('flags').innerHTML = Object.entries(COUNTRIES).map(([code, c], i) => `
        <button class="flag ${code === activeCountry ? 'active' : ''}" data-code="${code}" style="transition-delay: ${i * 150}ms" onclick="selectCountry('${code}')">
            <span class="flag-img">${FLAG_SVG[code]}</span>
            <span class="flag-name">${c.name}</span>
            <span class="flag-meta">${c.meta}</span>
        </button>`).join('');
    renderNetworkDetail();
}

function selectCountry(code) {
    activeCountry = code;
    document.querySelectorAll('.flag').forEach(f => f.classList.toggle('active', f.dataset.code === code));
    renderNetworkDetail();
}

function renderNetworkDetail() {
    const c = COUNTRIES[activeCountry];
    const places = PLACES.filter(p => p.country === activeCountry).map(p => `<li><i class="fa-solid fa-location-dot"></i> ${p.name}</li>`).join('');
    const gates = activeCountry === 'VN'
        ? GATES.map(g => `<li><i class="fa-solid fa-flag"></i> ${g.name} <span style="color: var(--muted)">(${COUNTRIES[g.country].name})</span></li>`).join('')
        : GATES.filter(g => g.country === activeCountry).map(g => `<li><i class="fa-solid fa-flag"></i> ${g.name}</li>`).join('');
    document.getElementById('network-detail').innerHTML = `
        <h3>${c.name}</h3>
        <div class="network-cols">
            <div><h4>Điểm nhận / giao ngựa</h4><ul>${places}</ul></div>
            <div><h4>${activeCountry === 'VN' ? 'Cửa khẩu đường bộ phục vụ' : 'Cửa khẩu với Việt Nam'}</h4><ul>${gates}</ul></div>
        </div>`;
}

// ===== Quy trình =====
const PROCESS = [
    ['fa-paper-plane', 'Gửi đơn', 'Khai thông tin ngựa, tải giấy tờ thú y, chọn dịch vụ.', `Trước ngày đi ≥ ${MIN_LEAD_DAYS} ngày`],
    ['fa-magnifying-glass', 'Thẩm định', 'Kiểm dịch viên xác minh hồ sơ, điều phối viên lập lộ trình.', 'Trong 5 ngày làm việc'],
    ['fa-credit-card', 'Duyệt & thanh toán', 'Quản lý duyệt đơn, bạn thanh toán 100% giá trên đơn.', 'Trong 48 giờ'],
    ['fa-folder-open', 'Chuẩn bị giấy tờ', 'Bạn gửi bản gốc giấy tờ, chúng tôi làm thủ tục kiểm dịch và hải quan.', 'Trước ngày đi 3 ngày'],
    ['fa-truck-moving', 'Vận chuyển', 'Kiểm tra sức khỏe trước khi lên xe, theo dõi hành trình trực tuyến.', 'Theo lộ trình'],
    ['fa-clipboard-check', 'Nghiệm thu', 'Kiểm tra tình trạng ngựa khi nhận và xác nhận hoàn thành.', 'Trong 24 giờ']
];

function renderSteps() {
    document.getElementById('steps').innerHTML = PROCESS.map(([icon, title, text, time], i) => `
        <li class="step reveal" data-delay="${i * 100}">
            <span class="step-num"><i class="fa-solid ${icon}"></i></span>
            <h3>${i + 1}. ${title}</h3>
            <p>${text}</p>
            <small>${time}</small>
        </li>`).join('');
}

// ===== Banner trượt =====
let slideIndex = 0;
let slideTimer = null;

function showSlide(i) {
    const slides = document.querySelectorAll('.hero-slide');
    slideIndex = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('active', k === slideIndex));
    document.querySelectorAll('.hero-dot').forEach((d, k) => d.classList.toggle('active', k === slideIndex));
}

function startSlider() {
    clearInterval(slideTimer);
    slideTimer = setInterval(() => showSlide(slideIndex + 1), 6000);
}

function initSlider() {
    const count = document.querySelectorAll('.hero-slide').length;
    document.getElementById('hero-dots').innerHTML = Array.from({ length: count }, (_, i) =>
        `<button class="hero-dot ${i === 0 ? 'active' : ''}" aria-label="Chuyển tới banner ${i + 1}" onclick="showSlide(${i}); startSlider();"></button>`).join('');
    const hero = document.querySelector('.hero');
    hero.addEventListener('mouseenter', () => clearInterval(slideTimer));
    hero.addEventListener('mouseleave', startSlider);
    startSlider();
}

// ===== Hiệu ứng khi cuộn =====
function initReveal() {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.dataset.delay) el.style.transitionDelay = `${el.dataset.delay}ms`;
        el.classList.add('shown');
        observer.unobserve(el);
    }), { threshold: 0.15 });
    document.querySelectorAll('.reveal, .flag').forEach(el => observer.observe(el));
}

function initScrollEffects() {
    const header = document.getElementById('site-header');
    const toTop = document.getElementById('float-top');
    const onScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 10);
        toTop.classList.toggle('shown', window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

function toggleMenu() {
    document.getElementById('site-nav').classList.toggle('open');
}

// ===== Khởi tạo =====
function initFeeForm() {
    const options = Object.entries(COUNTRIES).map(([code, c]) =>
        `<optgroup label="${c.name}">${PLACES.filter(p => p.country === code).map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</optgroup>`).join('');
    document.getElementById('fee-from').innerHTML = options;
    document.getElementById('fee-to').innerHTML = options;
    document.getElementById('fee-from').value = 'dni';
    document.getElementById('fee-to').value = 'pnh';
}

document.getElementById('gate-count').textContent = GATES.length;
initFeeForm();
renderPriceTable();
renderFlags();
renderSteps();
initSlider();
initReveal();
initScrollEffects();
