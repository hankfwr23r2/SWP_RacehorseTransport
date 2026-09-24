// ===== Quy tắc =====
// - Khách thấy yêu cầu thanh toán khi manager đã duyệt đơn.
// - Hạn thanh toán = thời điểm duyệt + PAYMENT_HOURS giờ; thanh toán 100% tổng giá trị đơn.
// - Quá hạn chưa thanh toán: đơn tự hủy, chỗ xe giữ tạm được nhả.
// - Hạn thẩm định cam kết với khách = mốc SỚM HƠN của:
//     (1) 17:00 ngày làm việc thứ APPRAISAL_WORKING_DAYS sau ngày gửi đơn
//         (kiểm dịch 2 ngày + lập lộ trình 2 ngày + duyệt 1 ngày)
//     (2) 17:00 của (ngày khởi hành − APPRAISAL_CAP_DAYS); rơi vào ngày nghỉ thì lùi về ngày làm việc trước
//         (để còn 2 ngày thanh toán + 2 ngày chuẩn bị)
// - Quá hạn thẩm định (công ty chịu trách nhiệm, không đẩy rủi ro sang khách):
//     + Chỗ xe đã giữ từ lúc đặt đơn, ngày khởi hành KHÔNG đổi.
//     + Đơn chuyển sang "Ưu tiên": Quản lý trực tiếp xử lý, cam kết mới = 17:00 ngày làm việc kế tiếp sau hạn cũ.
//     + Khách vẫn được hủy miễn phí nếu không muốn chờ (phương án phụ).
// - Hạn thanh toán = mốc SỚM HƠN của (duyệt + PAYMENT_HOURS giờ) và 17:00 của (khởi hành − PAYMENT_CAP_DAYS ngày),
//   để đơn duyệt muộn vẫn còn thời gian chuẩn bị.
const PAYMENT_HOURS = 48;
const PAYMENT_CAP_DAYS = 2;
const APPRAISAL_WORKING_DAYS = 5;
const APPRAISAL_CAP_DAYS = 4;
const PRIORITY_WORKING_DAYS = 1;
const HOTLINE = '1900 6868';
const WORK_END_HOUR = 17;
const HOLIDAYS = ['2026-01-01', '2026-04-30', '2026-05-01', '2026-09-02', '2027-01-01'];
const URGENT_HOURS = 12; // còn ít hơn số giờ này thì cảnh báo đỏ
const HOUR = 60 * 60 * 1000;

// Chính sách hoàn tiền hiển thị cho khách (tính theo số ngày trước ngày khởi hành)
const REFUND_POLICY = [
    ['Công ty hủy chuyến', '100%'],
    ['Ngựa không đạt kiểm tra sức khỏe tại chỗ ngày lấy ngựa', '100% trừ phí kiểm dịch đã phát sinh'],
    ['Khách hủy trước khởi hành từ 7 ngày trở lên', '90%'],
    ['Khách hủy trước khởi hành 3 – 6 ngày', '50%'],
    ['Khách hủy trước khởi hành dưới 3 ngày', 'Không hoàn']
];

const BANK = { name: 'Vietcombank', account: '0071 000 123 456', owner: 'CONG TY TNHH EQUINEZ LOGISTICS' };

// Các bước khách nhìn thấy (các bước nội bộ tiếp nhận, kiểm dịch, lập lộ trình, duyệt gộp thành "Chờ thẩm định")
const STEPS = ['Gửi đơn', 'Chờ thẩm định', 'Thanh toán', 'Vận chuyển', 'Nghiệm thu'];

// ===== Ngày làm việc =====
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isWorkingDay = d => d.getDay() !== 0 && d.getDay() !== 6 && !HOLIDAYS.includes(dayKey(d));

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
function addWorkingDays(t, n) {
    const d = startOfDay(t);
    const step = n > 0 ? 1 : -1;
    let left = Math.abs(n);
    while (left > 0) {
        d.setDate(d.getDate() + step);
        if (isWorkingDay(d)) left--;
    }
    return d;
}

// ===== Dữ liệu mẫu (ngày tính tương đối so với hôm nay) =====
// status: processing | awaiting_payment | paid | in_transit | delivered (chờ nghiệm thu) | completed | rejected | cancelled
// trip (khi đang vận chuyển): checkpoints [{ label, time, state: done | current | next }], health [...], contacts
const now = Date.now();
const today = startOfDay(now);
const daysFromToday = (k, hour = 0) => { const d = new Date(today); d.setDate(d.getDate() + k); d.setHours(hour); return d.getTime(); };
const workdaysAgo = (k, hour = 9) => atHour(addWorkingDays(isWorkingDay(today) ? today : addWorkingDays(today, -1), -k), hour);
const orders = [
    {
        id: 'EQ-2026-1064', submittedAt: daysFromToday(-2, 9), departAt: daysFromToday(15),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Đại Nam (Bình Dương, VN)',
        routeShort: 'Đồng Nai → Bình Dương', border: null, distance: '65 km', duration: '~2 giờ',
        horses: ['Hắc Phong (Thoroughbred, Đực)'],
        vehicle: 'Xe chuyên dụng 2 ngăn', stops: ['Trang trại Long Thành — nhận ngựa', 'Trường đua Đại Nam — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 65 km', 4200000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 1 ngựa', 900000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · nước điện giải', 400000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 500000]
        ],
        status: 'awaiting_payment', approvedAt: now - 43 * HOUR
    },
    {
        id: 'EQ-2026-1042', submittedAt: daysFromToday(-2, 9), departAt: daysFromToday(12),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Đồng Nai → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', distance: '290 km', duration: '~7 giờ',
        horses: ['Storm Runner (Thoroughbred, Thiến)', 'Bạch Phong (Arabian, Cái)'],
        vehicle: 'Xe chuyên dụng 4 ngăn',
        stops: ['Trang trại Long Thành (Đồng Nai) — nhận ngựa', 'Cửa khẩu Mộc Bài (Tây Ninh) — thông quan', 'Cửa khẩu Bavet (Svay Rieng) — kiểm tra thú y', 'Trường đua Phnom Penh Royal Turf — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 290 km', 17000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 6500000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 1500000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1500000]
        ],
        status: 'awaiting_payment', approvedAt: now - 3 * HOUR
    },
    {
        id: 'EQ-2026-1063', submittedAt: daysFromToday(0, 9), departAt: daysFromToday(18),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phú Thọ (TP.HCM, VN)',
        routeShort: 'Đồng Nai → TP.HCM', border: null, distance: '60 km', duration: '~2 giờ',
        horses: ['Storm Runner (Thoroughbred, Thiến)', 'Kim Lân (Thoroughbred, Đực)'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 60 km', 5000000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 2 ngựa', 1500000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · nước điện giải', 600000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 900000]
        ],
        status: 'processing'
    },
    {
        id: 'EQ-2026-1055', submittedAt: workdaysAgo(APPRAISAL_WORKING_DAYS + 1), departAt: daysFromToday(12),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Vientiane Turf Club (Viêng Chăn, LA)',
        routeShort: 'Đồng Nai → Viêng Chăn (LA)', border: 'Lao Bảo – Densavanh', distance: '1,250 km', duration: '3 ngày',
        horses: ['Kim Lân (Thoroughbred, Đực)'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 1,250 km', 32000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Lao Bảo – Densavanh', 4800000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 2400000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1500000]
        ],
        status: 'processing'
    },
    {
        id: 'EQ-2026-1028', submittedAt: daysFromToday(-15, 9), departAt: daysFromToday(0),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Đồng Nai → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', distance: '290 km', duration: '~7 giờ',
        horses: ['Kim Lân (Thoroughbred, Đực)'],
        vehicle: 'Xe chuyên dụng 2 ngăn',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Cửa khẩu Mộc Bài — thông quan', 'Cửa khẩu Bavet — kiểm tra thú y', 'Trường đua Phnom Penh Royal Turf — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 290 km', 11000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 3200000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 800000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1000000]
        ],
        status: 'in_transit', approvedAt: daysFromToday(-8, 10), paidAt: daysFromToday(-7, 15),
        trip: {
            plate: '51C-123.45', eta: now + 3 * HOUR, updatedAt: now - 10 * 60000,
            contacts: [['Tài xế', 'Nguyễn Văn Hùng', '0908 111 222'], ['NV chăm sóc', 'Võ Thị Lan', '0908 333 444']],
            checkpoints: [
                { label: 'Kiểm tra sức khỏe tại chỗ — Đạt', place: 'Trang trại Long Thành', time: now - 6 * HOUR, state: 'done' },
                { label: 'Nhận ngựa lên xe, khởi hành', place: 'Trang trại Long Thành', time: now - 5.5 * HOUR, state: 'done' },
                { label: 'Dừng nghỉ, cho ngựa uống nước', place: 'Trạm dừng Trảng Bàng (Tây Ninh)', time: now - 3 * HOUR, state: 'done' },
                { label: 'Thông quan xuất cảnh', place: 'Cửa khẩu Mộc Bài (VN)', time: now - 1.5 * HOUR, state: 'done' },
                { label: 'Kiểm tra thú y nhập cảnh', place: 'Cửa khẩu Bavet (KH)', time: now - 0.5 * HOUR, state: 'current' },
                { label: 'Giao ngựa', place: 'Trường đua Phnom Penh Royal Turf', time: now + 3 * HOUR, state: 'next' }
            ],
            health: [
                { time: now - 40 * 60000, temp: '37.8°C', heart: '36 bpm', note: 'Ăn uống bình thường, đứng vững trong khoang' },
                { time: now - 3 * HOUR, temp: '37.6°C', heart: '38 bpm', note: 'Đã uống 8 lít nước tại trạm dừng' },
                { time: now - 6 * HOUR, temp: '37.5°C', heart: '34 bpm', note: 'Kiểm tra trước khi lên xe: đạt' }
            ]
        }
    },
    {
        id: 'EQ-2026-1019', submittedAt: daysFromToday(-16, 9), departAt: daysFromToday(0),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Đại Nam (Bình Dương, VN)',
        routeShort: 'Đồng Nai → Bình Dương', border: null, distance: '65 km', duration: '~2 giờ',
        horses: ['Storm Runner (Thoroughbred, Thiến)'],
        vehicle: 'Xe chuyên dụng 2 ngăn',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Trường đua Đại Nam — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 65 km', 3900000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 1 ngựa', 900000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · nước điện giải', 400000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 400000]
        ],
        status: 'delivered', approvedAt: daysFromToday(-8, 10), paidAt: now - 6 * 24 * HOUR, deliveredAt: now - 3 * HOUR
    },
    {
        id: 'EQ-2026-1030', submittedAt: daysFromToday(-12, 9), departAt: daysFromToday(6),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Đồng Nai → Đà Nẵng', border: null, distance: '930 km', duration: '2 ngày',
        horses: ['Bạch Phong (Arabian, Cái)'],
        vehicle: 'Xe chuyên dụng 2 ngăn',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Trạm nghỉ Tuy Hòa (Phú Yên) — nghỉ đêm', 'Trường đua Sông Hàn (Đà Nẵng) — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 930 km', 21000000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 1 ngựa', 900000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 2400000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1200000]
        ],
        status: 'paid', approvedAt: now - 9 * 24 * HOUR, paidAt: now - 8 * 24 * HOUR
    },
    {
        id: 'EQ-2026-1021', submittedAt: daysFromToday(-22, 9), departAt: daysFromToday(-6),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phú Thọ (TP.HCM, VN)',
        routeShort: 'Đồng Nai → TP.HCM', border: null, distance: '60 km', duration: '~2 giờ',
        horses: ['Storm Runner (Thoroughbred, Thiến)'],
        vehicle: 'Xe chuyên dụng 2 ngăn',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Trường đua Phú Thọ — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 60 km', 3800000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 1 ngựa', 900000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 400000]
        ],
        status: 'completed', approvedAt: now - 20 * 24 * HOUR, paidAt: now - 19 * 24 * HOUR
    },
    {
        id: 'EQ-2026-1049', submittedAt: daysFromToday(-1, 9), departAt: daysFromToday(12),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Đồng Nai → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', distance: '290 km', duration: '~7 giờ',
        horses: ['Storm Runner (Thoroughbred, Thiến)', 'Bạch Phong (Arabian, Cái)'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 290 km', 17000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 6500000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 1500000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1500000]
        ],
        status: 'rejected', reason: 'Đơn trùng lặp: trùng với đơn EQ-2026-1042 (cùng 2 ngựa, cùng ngày khởi hành).'
    },
    {
        id: 'EQ-2026-1025', submittedAt: daysFromToday(-19, 9), departAt: daysFromToday(-4),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Angkor (Siem Reap, KH)',
        routeShort: 'Đồng Nai → Siem Reap (KH)', border: 'Mộc Bài – Bavet', distance: '560 km', duration: '2 ngày',
        horses: ['Kim Lân (Thoroughbred, Đực)'],
        vehicle: 'Xe chuyên dụng 2 ngăn',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Cửa khẩu Mộc Bài — thông quan', 'Trường đua Angkor — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 560 km', 15000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 4800000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1000000]
        ],
        status: 'awaiting_payment', approvedAt: now - 10 * 24 * HOUR
    }
];

// ===== Tiện ích =====
const formatVND = n => n.toLocaleString('en-US') + ' ₫';
const formatTime = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const orderTotal = order => order.services.reduce((total, svc) => total + svc[2], 0);
const formatDate = t => formatTime(t).split(' ')[0];

function lastWorkingDayBefore(t, days) {
    const d = new Date(t);
    d.setDate(d.getDate() - days);
    while (!isWorkingDay(d)) d.setDate(d.getDate() - 1);
    return d;
}

function paymentDeadline(order) {
    return Math.min(order.approvedAt + PAYMENT_HOURS * HOUR, atHour(lastWorkingDayBefore(order.departAt, PAYMENT_CAP_DAYS), WORK_END_HOUR));
}

function appraisalDeadline(order) {
    const byWorkingDays = atHour(addWorkingDays(order.submittedAt, APPRAISAL_WORKING_DAYS), WORK_END_HOUR);
    return Math.min(byWorkingDays, atHour(lastWorkingDayBefore(order.departAt, APPRAISAL_CAP_DAYS), WORK_END_HOUR));
}

// Cam kết mới khi đơn quá hạn và chuyển sang ưu tiên
const priorityDeadline = order => atHour(addWorkingDays(appraisalDeadline(order), PRIORITY_WORKING_DAYS), WORK_END_HOUR);

const isAppraisalOverdue = order => order.status === 'processing' && Date.now() > appraisalDeadline(order);

function timeLeft(order) {
    const ms = paymentDeadline(order) - Date.now();
    const hours = Math.floor(ms / HOUR);
    const minutes = Math.floor((ms % HOUR) / 60000);
    return { ms, text: `${hours} giờ ${pad(minutes)} phút`, urgent: ms < URGENT_HOURS * HOUR };
}

// Quá hạn thanh toán → tự hủy
function expireOverdue() {
    orders.forEach(order => {
        if (order.status === 'awaiting_payment' && Date.now() > paymentDeadline(order)) {
            order.status = 'cancelled';
            order.reason = `Quá hạn thanh toán (hạn ${formatTime(paymentDeadline(order))}).`;
        }
    });
}

// Bước hiện tại trên thanh tiến trình
function currentStep(order) {
    switch (order.status) {
        case 'processing': return 1;
        case 'awaiting_payment': return 2;
        case 'paid': return 3;
        case 'in_transit': return 3;
        case 'delivered': return 4;
        case 'completed': return STEPS.length;
        case 'rejected': return 1;
        case 'cancelled': return order.approvedAt ? 2 : 1;
    }
}

function statusBadge(order) {
    switch (order.status) {
        case 'processing': return isAppraisalOverdue(order)
            ? `<span class="badge badge-danger"><i class="fa-solid fa-bolt"></i> Đang xử lý ưu tiên · trước ${formatTime(priorityDeadline(order))}</span>`
            : `<span class="badge badge-info"><i class="fa-solid fa-hourglass-half"></i> Chờ thẩm định · trước ${formatTime(appraisalDeadline(order))}</span>`;
        case 'awaiting_payment': {
            const left = timeLeft(order);
            return `<span class="badge ${left.urgent ? 'badge-danger' : 'badge-warning'}"><i class="fa-regular fa-clock"></i> Chờ thanh toán · còn ${left.text}</span>`;
        }
        case 'paid': return '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Đã thanh toán · chờ khởi hành</span>';
        case 'in_transit': return `<span class="badge badge-info"><i class="fa-solid fa-truck-moving"></i> Đang vận chuyển · dự kiến giao ${formatTime(order.trip.eta)}</span>`;
        case 'delivered': return '<span class="badge badge-warning"><i class="fa-solid fa-clipboard-check"></i> Đã giao · chờ bạn nghiệm thu</span>';
        case 'completed': return '<span class="badge badge-success"><i class="fa-solid fa-flag-checkered"></i> Hoàn thành</span>';
        case 'rejected': return '<span class="badge badge-muted"><i class="fa-solid fa-xmark"></i> Bị từ chối</span>';
        case 'cancelled': return '<span class="badge badge-muted"><i class="fa-solid fa-ban"></i> Đã hủy</span>';
    }
}

// ===== Danh sách =====
const TABS = [
    ['all', 'Tất cả', () => true],
    ['processing', 'Chờ thẩm định', o => o.status === 'processing'],
    ['awaiting_payment', 'Chờ thanh toán', o => o.status === 'awaiting_payment'],
    ['paid', 'Đã thanh toán', o => o.status === 'paid'],
    ['in_transit', 'Đang vận chuyển', o => o.status === 'in_transit'],
    ['delivered', 'Chờ nghiệm thu', o => o.status === 'delivered'],
    ['closed', 'Đã đóng', o => ['completed', 'rejected', 'cancelled'].includes(o.status)]
];
let currentTab = 'all';

function renderList() {
    expireOverdue();
    document.getElementById('payment-hours').textContent = PAYMENT_HOURS;

    const waiting = orders.filter(o => o.status === 'awaiting_payment');
    document.getElementById('payment-alert').innerHTML = waiting.length
        ? `<div class="alert-box alert-warning"><i class="fa-solid fa-credit-card" style="margin-top: 3px;"></i><div>
            Bạn có <strong>${waiting.length} đơn đã được duyệt</strong> đang chờ thanh toán.
            Hạn gần nhất: <strong>${formatTime(Math.min(...waiting.map(paymentDeadline)))}</strong>. Quá hạn đơn sẽ tự hủy.
           </div></div>`
        : '';

    document.getElementById('order-tabs').innerHTML = TABS.map(([key, label, match]) =>
        `<button class="order-tab ${key === currentTab ? 'active' : ''}" onclick="switchTab('${key}')">${label} (${orders.filter(match).length})</button>`
    ).join('');

    const match = TABS.find(t => t[0] === currentTab)[2];
    const list = orders.filter(match);
    document.getElementById('order-list').innerHTML = list.length
        ? list.map(order => `
            <tr>
                <td class="font-semibold text-orange nowrap">${order.id}</td>
                <td>${order.routeShort}${order.border ? `<div class="sub-text"><i class="fa-solid fa-flag"></i> ${order.border}</div>` : ''}</td>
                <td class="nowrap">${formatDate(order.departAt)}</td>
                <td class="text-right font-semibold nowrap">${formatVND(orderTotal(order))}</td>
                <td>${statusBadge(order)}</td>
                <td class="text-right nowrap">${order.status === 'awaiting_payment'
                    ? `<button class="btn btn-primary" onclick="showDetail('${order.id}')"><i class="fa-solid fa-credit-card"></i> Thanh toán</button>`
                    : order.status === 'delivered'
                        ? `<a class="btn btn-primary" href="acceptance.html?id=${order.id}"><i class="fa-solid fa-clipboard-check"></i> Nghiệm thu</a>`
                        : `<button class="btn btn-light-outline" onclick="showDetail('${order.id}')"><i class="fa-solid fa-eye"></i> Xem</button>`}</td>
            </tr>`).join('')
        : '<tr><td colspan="6" class="text-center text-muted" style="padding: 24px;">Không có đơn nào</td></tr>';
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
let activeOrder = null;

function infoRow(label, value) {
    return `<div class="info-row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function showDetail(orderId) {
    expireOverdue();
    const order = orders.find(o => o.id === orderId);
    activeOrder = order;

    document.getElementById('d-crumb').textContent = order.id;
    document.getElementById('d-title').textContent = `Đơn ${order.id}`;
    document.getElementById('d-badge').innerHTML = statusBadge(order);

    // Thanh tiến trình
    const step = currentStep(order);
    document.getElementById('d-stepper').innerHTML = STEPS.map((label, i) => {
        let cls = 'step';
        let icon = i + 1;
        if ((order.status === 'rejected' || order.status === 'cancelled') && i === step) {
            cls += ' failed';
            icon = '<i class="fa-solid fa-xmark"></i>';
        } else if (i < step) {
            cls += ' completed';
            icon = '<i class="fa-solid fa-check"></i>';
        } else if (i === step) {
            cls += ' active';
        }
        return `<div class="${cls}"><div class="step-number">${icon}</div><div class="step-label">${label}</div></div>`;
    }).join('');

    // Thông báo theo trạng thái
    const banners = {
        processing: isAppraisalOverdue(order)
            ? ['alert-warning', 'fa-bolt', `<strong>Đơn đang được Quản lý xử lý ưu tiên</strong> vì chưa kịp thẩm định trong hạn ${formatTime(appraisalDeadline(order))}.
                <ul class="priority-list">
                    <li><i class="fa-solid fa-truck"></i> Chỗ xe cho ngày khởi hành <strong>${formatDate(order.departAt)}</strong> vẫn được giữ, ngày khởi hành không đổi.</li>
                    <li><i class="fa-regular fa-clock"></i> Cam kết có kết quả trước <strong>${formatTime(priorityDeadline(order))}</strong>${Date.now() > priorityDeadline(order) ? ' — Quản lý phụ trách sẽ gọi trực tiếp cho bạn' : ''}.</li>
                    <li><i class="fa-solid fa-headset"></i> Nếu có thắc mắc hoặc cần hỗ trợ về đơn, vui lòng liên hệ hotline <strong>${HOTLINE}</strong>.</li>
                </ul>`]
            : ['alert-info', 'fa-hourglass-half', `Đơn đang được thẩm định: xác minh hồ sơ thú y và lập kế hoạch vận chuyển. Kết quả trước <strong>${formatTime(appraisalDeadline(order))}</strong>. Khi đơn được duyệt, bạn có ${PAYMENT_HOURS} giờ để thanh toán.`],
        rejected: ['alert-danger', 'fa-circle-xmark', `<strong>Đơn bị từ chối.</strong> ${order.reason} Bạn chưa thanh toán nên không phát sinh chi phí.`],
        cancelled: ['alert-danger', 'fa-ban', `<strong>Đơn đã hủy.</strong> ${order.reason}`]
    };
    const banner = banners[order.status];
    document.getElementById('d-banner').innerHTML = banner
        ? `<div class="alert-box ${banner[0]}"><i class="fa-solid ${banner[1]}" style="margin-top: 3px;"></i><div>${banner[2]}</div></div>`
        : '';

    // Thông tin đơn
    document.getElementById('d-info').innerHTML =
        infoRow('Gửi đơn lúc', formatTime(order.submittedAt)) +
        infoRow('Điểm đi', order.from) +
        infoRow('Điểm đến', order.to) +
        infoRow('Loại tuyến', order.border ? `Xuyên quốc gia · cửa khẩu ${order.border}` : 'Nội địa') +
        infoRow('Quãng đường / Thời gian', `${order.distance} · ${order.duration}`) +
        infoRow('Ngày khởi hành', `<span class="text-orange">${formatDate(order.departAt)}</span>`) +
        infoRow(`Ngựa (${order.horses.length})`, order.horses.join('<br>'));

    // Kết quả thẩm định: chỉ có khi đơn đã được duyệt
    const approved = ['awaiting_payment', 'paid', 'in_transit', 'delivered', 'completed'].includes(order.status) || (order.status === 'cancelled' && order.approvedAt);
    document.getElementById('d-plan-card').style.display = approved ? 'block' : 'none';
    if (approved) {
        document.getElementById('d-plan').innerHTML = `
            <ul class="plan-checks">
                <li><i class="fa-solid fa-circle-check"></i> Hồ sơ ngựa hợp lệ — đã được kiểm dịch viên xác nhận</li>
                <li><i class="fa-solid fa-circle-check"></i> Đã lập kế hoạch vận chuyển — ${order.vehicle}</li>
                <li><i class="fa-solid fa-circle-check"></i> Đơn được duyệt lúc ${formatTime(order.approvedAt)}</li>
            </ul>
            <div class="sub-title">Lộ trình dự kiến</div>
            <ol class="plan-stops">${order.stops.map(s => `<li>${s}</li>`).join('')}</ol>`;
    }

    // Hành trình & sức khỏe (chỉ khi đang vận chuyển)
    const inTransit = order.status === 'in_transit';
    document.getElementById('d-trip-card').style.display = inTransit ? 'block' : 'none';
    document.getElementById('d-health-card').style.display = inTransit ? 'block' : 'none';
    if (inTransit) {
        const trip = order.trip;
        document.getElementById('d-trip-updated').textContent = `Cập nhật lúc ${formatTime(trip.updatedAt)}`;
        document.getElementById('d-trip').innerHTML = `
            <ol class="trip-timeline">
                ${trip.checkpoints.map(c => `
                    <li class="trip-point ${c.state}">
                        <div class="trip-dot">${c.state === 'done' ? '<i class="fa-solid fa-check"></i>' : c.state === 'current' ? '<i class="fa-solid fa-truck-moving"></i>' : ''}</div>
                        <div class="trip-text">
                            <div class="trip-label">${c.label}${c.state === 'current' ? ' <span class="badge badge-info">Đang ở đây</span>' : ''}</div>
                            <div class="sub-text">${c.place} · ${c.state === 'next' ? 'dự kiến ' : ''}${formatTime(c.time)}</div>
                        </div>
                    </li>`).join('')}
            </ol>`;
        document.getElementById('d-health').innerHTML = `
            <table class="data-table">
                <thead><tr><th>Thời điểm</th><th>Thân nhiệt</th><th>Nhịp tim</th><th>Ghi chú của NV chăm sóc</th></tr></thead>
                <tbody>${trip.health.map(h => `<tr><td class="nowrap">${formatTime(h.time)}</td><td>${h.temp}</td><td>${h.heart}</td><td class="text-muted">${h.note}</td></tr>`).join('')}</tbody>
            </table>`;
    }

    // Dịch vụ đã chọn
    document.getElementById('d-services').innerHTML = `
        <table class="data-table">
            <thead><tr><th>Dịch vụ</th><th>Lựa chọn</th><th class="text-right">Thành tiền</th></tr></thead>
            <tbody>${order.services.map(svc => `<tr><td class="font-semibold">${svc[0]}</td><td class="text-muted">${svc[1]}</td><td class="text-right nowrap">${formatVND(svc[2])}</td></tr>`).join('')}</tbody>
            <tfoot><tr class="total-row"><td colspan="2">TỔNG GIÁ TRỊ ĐƠN</td><td class="text-right nowrap">${formatVND(orderTotal(order))}</td></tr></tfoot>
        </table>`;

    document.getElementById('d-side').innerHTML = sidePanel(order);
    document.getElementById('list-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    window.scrollTo(0, 0);
}

function policyCard() {
    return `
        <div class="card">
            <div class="card-header"><h3><i class="fa-solid fa-shield-halved text-orange"></i> Cam kết &amp; hoàn tiền</h3></div>
            <div class="card-body">
                <ul class="plan-checks">
                    <li><i class="fa-solid fa-file-signature"></i> Hợp đồng điện tử và hóa đơn gửi qua email ngay sau khi thanh toán</li>
                    <li><i class="fa-solid fa-umbrella"></i> Ngựa được bảo hiểm theo gói đã chọn trong suốt hành trình</li>
                    <li><i class="fa-solid fa-location-dot"></i> Theo dõi hành trình và sức khỏe ngựa ngay trong mục Đơn của tôi</li>
                </ul>
                <table class="policy-table">
                    <thead><tr><th>Trường hợp</th><th class="text-right">Hoàn tiền</th></tr></thead>
                    <tbody>${REFUND_POLICY.map(([c, r]) => `<tr><td>${c}</td><td class="text-right font-semibold">${r}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        </div>`;
}

function sidePanel(order) {
    const total = formatVND(orderTotal(order));
    if (order.status === 'awaiting_payment') {
        const left = timeLeft(order);
        return `
            <div class="card pay-card">
                <div class="card-header"><h3><i class="fa-solid fa-credit-card text-orange"></i> Thanh toán</h3></div>
                <div class="card-body">
                    ${infoRow('Tổng giá trị đơn', total)}
                    <div class="payment-total">Cần thanh toán: <span class="text-orange">${total}</span></div>
                    <div class="deadline-box ${left.urgent ? 'urgent' : ''}">
                        <div><i class="fa-regular fa-clock"></i> Còn <strong>${left.text}</strong></div>
                        <div class="deadline-sub">Hạn thanh toán: ${formatTime(paymentDeadline(order))}</div>
                    </div>
                    <button class="btn btn-primary btn-full" onclick="openPay()"><i class="fa-solid fa-credit-card"></i> Thanh toán ngay</button>
                    <p class="side-hint">Quá hạn chưa thanh toán, đơn sẽ tự hủy.</p>
                </div>
            </div>
            ${policyCard()}`;
    }
    if (order.status === 'paid') {
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-circle-check" style="color: #059669;"></i> Đã thanh toán</h3></div>
                <div class="card-body">
                    ${infoRow('Số tiền', total)}
                    ${infoRow('Thanh toán lúc', formatTime(order.paidAt))}
                    <div class="sub-title">Bước tiếp theo</div>
                    <ol class="plan-stops">
                        <li>Hợp đồng điện tử và hóa đơn đã gửi qua email</li>
                        <li>Ngày ${formatDate(order.departAt)}: kiểm dịch viên kiểm tra sức khỏe ngựa tại chỗ trước khi lên xe</li>
                        <li>Khởi hành; theo dõi hành trình ngay trên trang này</li>
                    </ol>
                </div>
            </div>
            ${policyCard()}`;
    }
    if (order.status === 'delivered') {
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-clipboard-check text-orange"></i> Chờ nghiệm thu</h3></div>
                <div class="card-body">
                    ${infoRow('Giao ngựa lúc', formatTime(order.deliveredAt))}
                    ${infoRow('Đã thanh toán', total)}
                    <a href="acceptance.html?id=${order.id}" class="btn btn-primary btn-full" style="margin-top: 12px;"><i class="fa-solid fa-clipboard-check"></i> Nghiệm thu ngay</a>
                </div>
            </div>`;
    }
    if (order.status === 'completed') {
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-flag-checkered" style="color: #059669;"></i> Hoàn thành</h3></div>
                <div class="card-body">
                    ${infoRow('Đã thanh toán', total)}
                    ${infoRow('Thanh toán lúc', formatTime(order.paidAt))}
                    <a href="acceptance.html?id=${order.id}" class="btn btn-primary btn-full" style="margin-top: 12px;"><i class="fa-solid fa-clipboard-check"></i> Xem biên bản nghiệm thu</a>
                </div>
            </div>`;
    }
    if (order.status === 'in_transit') {
        const trip = order.trip;
        const current = trip.checkpoints.find(c => c.state === 'current');
        const done = trip.checkpoints.filter(c => c.state === 'done').length;
        const percent = Math.round(done / (trip.checkpoints.length - 1) * 100);
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-truck-moving text-orange"></i> Vị trí hiện tại</h3></div>
                <div class="card-body">
                    <div class="trip-now">${current.place}</div>
                    <div class="sub-text">${current.label}</div>
                    <div class="trip-progress"><div style="width: ${percent}%;"></div></div>
                    ${infoRow('Đã qua', `${done}/${trip.checkpoints.length - 1} điểm`)}
                    ${infoRow('Dự kiến giao ngựa', formatTime(trip.eta))}
                    ${infoRow('Xe', `${order.vehicle} · ${trip.plate}`)}
                    <div class="sub-title">Liên hệ trên xe</div>
                    ${trip.contacts.map(([role, name, phone]) => infoRow(`${role}: ${name}`, `<a href="tel:${phone.replace(/\s/g, '')}" class="text-orange"><i class="fa-solid fa-phone"></i> ${phone}</a>`)).join('')}
                    ${infoRow('Hotline công ty', `<span class="text-orange">${HOTLINE}</span>`)}
                </div>
            </div>
            ${policyCard()}`;
    }
    if (order.status === 'processing') {
        const overdue = isAppraisalOverdue(order);
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-circle-info text-orange"></i> Thanh toán</h3></div>
                <div class="card-body">
                    ${infoRow('Tổng giá trị đơn', total)}
                    ${infoRow(overdue ? 'Cam kết kết quả (ưu tiên)' : 'Hạn thẩm định', formatTime(overdue ? priorityDeadline(order) : appraisalDeadline(order)))}
                    <p class="side-hint">Chưa cần thanh toán. Bạn sẽ nhận yêu cầu thanh toán 100% khi đơn được duyệt.</p>
                    ${overdue ? `
                        <a href="tel:${HOTLINE.replace(/\s/g, '')}" class="btn btn-light-outline btn-full" style="margin-top: 12px;"><i class="fa-solid fa-headset"></i> Liên hệ hỗ trợ: ${HOTLINE}</a>
                        <button class="btn-link-muted" onclick="cancelOverdue()">Không muốn chờ? Hủy đơn miễn phí</button>` : ''}
                </div>
            </div>
            ${policyCard()}`;
    }
    return `
        <div class="card">
            <div class="card-body">
                ${infoRow('Tổng giá trị đơn', total)}
                <p class="side-hint">Đơn đã đóng, không phát sinh thanh toán.</p>
                <a href="create_request.html" class="btn btn-primary btn-full" style="margin-top: 12px;"><i class="fa-solid fa-paper-plane"></i> Đặt chuyến mới</a>
            </div>
        </div>`;
}

// Khách hủy đơn quá hạn thẩm định
function cancelOverdue() {
    const order = activeOrder;
    document.getElementById('c-order').textContent = order.id;
    document.getElementById('c-body').innerHTML = `
        <p class="cancel-lead">Đơn đang được xử lý ưu tiên, cam kết có kết quả trước <strong>${formatTime(priorityDeadline(order))}</strong>. Nếu hủy:</p>
        <ul class="cancel-effects">
            <li><i class="fa-solid fa-circle-check"></i> <span><strong>Không mất phí</strong> — bạn chưa thanh toán cho đơn này.</span></li>
            <li><i class="fa-solid fa-circle-xmark"></i> <span>Đơn chuyển sang <strong>Đã hủy</strong>, chuyến ngày <strong>${formatDate(order.departAt)}</strong> sẽ không được thực hiện.</span></li>
            <li><i class="fa-solid fa-circle-xmark"></i> <span>Không thể khôi phục. Muốn vận chuyển lại, bạn cần đặt đơn mới.</span></li>
        </ul>`;
    document.getElementById('cancelModal').style.display = 'flex';
}

function closeCancel() {
    document.getElementById('cancelModal').style.display = 'none';
}

function confirmCancel() {
    activeOrder.status = 'cancelled';
    activeOrder.reason = `Bạn đã hủy đơn lúc ${formatTime(Date.now())} do quá hạn thẩm định (hạn ${formatTime(appraisalDeadline(activeOrder))}). Không phát sinh chi phí.`;
    closeCancel();
    showToast(`Đã hủy đơn ${activeOrder.id}. Không phát sinh chi phí.`);
    showDetail(activeOrder.id);
}

// ===== Thanh toán =====
function openPay() {
    const order = activeOrder;
    document.getElementById('p-order').textContent = order.id;
    document.getElementById('p-body').innerHTML = `
        <div class="pay-amount">
            <span>Số tiền cần thanh toán</span>
            <strong>${formatVND(orderTotal(order))}</strong>
            <span class="deadline-sub">Hạn: ${formatTime(paymentDeadline(order))}</span>
        </div>
        <div class="pay-methods">
            <label class="pay-method"><input type="radio" name="pay-method" value="bank" checked onchange="renderPayMethod()"> <i class="fa-solid fa-building-columns"></i> Chuyển khoản ngân hàng</label>
            <label class="pay-method"><input type="radio" name="pay-method" value="qr" onchange="renderPayMethod()"> <i class="fa-solid fa-qrcode"></i> Quét mã QR</label>
        </div>
        <div id="pay-method-body"></div>`;
    renderPayMethod();
    document.getElementById('payModal').style.display = 'flex';
}

function renderPayMethod() {
    const method = document.querySelector('input[name="pay-method"]:checked').value;
    const order = activeOrder;
    document.getElementById('pay-method-body').innerHTML = method === 'bank'
        ? `<div class="bank-box">
            ${infoRow('Ngân hàng', BANK.name)}
            ${infoRow('Số tài khoản', BANK.account)}
            ${infoRow('Chủ tài khoản', BANK.owner)}
            ${infoRow('Số tiền', formatVND(orderTotal(order)))}
            ${infoRow('Nội dung chuyển khoản', `<span class="text-orange">${order.id}</span>`)}
            <p class="side-hint">Ghi đúng nội dung chuyển khoản là mã đơn để hệ thống tự đối soát.</p>
           </div>`
        : `<div class="qr-box">
            <div class="qr-placeholder"><i class="fa-solid fa-qrcode"></i></div>
            <p class="side-hint">Mở ứng dụng ngân hàng và quét mã. Số tiền và nội dung <strong>${order.id}</strong> đã được điền sẵn.</p>
           </div>`;
}

function closePay() {
    document.getElementById('payModal').style.display = 'none';
}

function confirmPay() {
    activeOrder.status = 'paid';
    activeOrder.paidAt = Date.now();
    closePay();
    showToast(`Đã ghi nhận thanh toán đơn ${activeOrder.id}. Hợp đồng điện tử đã gửi qua email.`);
    showDetail(activeOrder.id);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.innerHTML = `<i class="fa-solid fa-check"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

renderList();
