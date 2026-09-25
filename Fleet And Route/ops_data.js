// ===== ops_data.js — Nguồn sự thật duy nhất của bộ phận Điều hành =====
// Mainflow: cho_khao_sat (OPS-03) → cho_lap_LT (OPS-05) → da_phan_cong (OPS-08)
//   → dang_chay (OPS-06) → xong. Sự cố (OPS-04): mo → da_de_xuat (chờ Manager).
// Giữ mã chuyến TR-xxxx trong nội bộ OPS; field orderId (EQ-xxxx) là điểm nối
// sang Manager/CUS — chốt thống nhất mã sau, không hardcode 2 hệ mã rời rạc.
// Chạy được cả trên trình duyệt (<script>) lẫn Node (test mainflow).

(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.OPS = api;
})(typeof self !== 'undefined' ? self : this, function () {
    const STORAGE_KEY = 'SWP_OPS_FLOW_V2';

    const STATUS_LABEL = {
        pending_assessment: 'Chờ khảo sát',
        awaiting_routing: 'Đã duyệt, chờ lập LT',
        assigned: 'Đã phân công, chờ khởi hành',
        in_transit: 'Đang vận chuyển',
        done: 'Hoàn thành',
        rejected_assessment: 'Không khả thi, trả Manager'
    };

    const INCIDENT_STATUS_LABEL = { open: 'Chờ xử lý', proposed: 'Đã trình Manager' };

    function seed() {
        return {
            trips: [
                {
                    id: 'TR-9035', orderId: 'EQ-2026-1040', customer: 'Trang trại Long Thành',
                    route: 'TP.HCM → Campuchia', horses: 1, depart: '02/11/2026',
                    status: 'pending_assessment', assessNote: '',
                    legs: [
                        { no: 1, from: 'Trang trại Long Thành', to: 'Cửa khẩu Mộc Bài', vehicleId: '', driverId: '', escortId: '' },
                        { no: 2, from: 'Cửa khẩu Bavet', to: 'Phnom Penh Royal Turf', vehicleId: '', driverId: '', escortId: '' }
                    ]
                },
                {
                    id: 'TR-9036', orderId: 'EQ-2026-1038', customer: 'Đại Nam Racing',
                    route: 'Bình Dương → TP.HCM', horses: 2, depart: '03/10/2026',
                    status: 'pending_assessment', assessNote: '',
                    legs: [
                        { no: 1, from: 'Trường đua Đại Nam', to: 'Trường đua Phú Thọ', vehicleId: '', driverId: '', escortId: '' }
                    ]
                },
                {
                    id: 'TR-9050', orderId: 'EQ-2026-1041', customer: 'Trường đua Thiên Mã',
                    route: 'Hà Nội → Viêng Chăn (LA)', horses: 3, depart: '08/10/2026',
                    status: 'awaiting_routing', assessNote: 'Tuyến Cầu Treo – Nam Phao, đi 2 ngày.',
                    legs: [
                        { no: 1, from: 'Trường đua Thiên Mã (Hà Nội)', to: 'Trạm nghỉ Vinh', vehicleId: '', driverId: '', escortId: '' },
                        { no: 2, from: 'Trạm nghỉ Vinh', to: 'Vientiane Turf Club', vehicleId: '', driverId: '', escortId: '' }
                    ]
                },
                {
                    id: 'TR-9051', orderId: 'EQ-2026-1033', customer: 'CLB Ngựa Sài Gòn',
                    route: 'TP.HCM → Savannakhet (LA)', horses: 2, depart: '25/09/2026',
                    status: 'awaiting_routing', assessNote: 'Tuyến Lao Bảo – Densavanh, đi 3 ngày.',
                    legs: [
                        { no: 1, from: 'Trường đua Phú Thọ (TP.HCM)', to: 'Trạm nghỉ Quy Nhơn', vehicleId: '', driverId: '', escortId: '' },
                        { no: 2, from: 'Trạm nghỉ Quy Nhơn', to: 'Cửa khẩu Lao Bảo', vehicleId: '', driverId: '', escortId: '' },
                        { no: 3, from: 'Cửa khẩu Densavanh', to: 'Trường đua Savannakhet', vehicleId: '', driverId: '', escortId: '' }
                    ]
                },
                {
                    id: 'TR-9021', orderId: 'EQ-2026-1042', customer: 'CLB Ngựa Đức Hòa',
                    route: 'Hà Nội → Lào', horses: 2, depart: '25/10/2026',
                    status: 'in_transit', assessNote: '',
                    legs: [
                        { no: 1, from: 'Hà Nội (Trang trại CLB)', to: 'Cửa khẩu Cầu Treo', vehicleId: 'VH-001', driverId: 'TX-01', escortId: 'NV-01' },
                        { no: 2, from: 'Cửa khẩu Nam Phao', to: 'Viêng Chăn', vehicleId: 'VH-001', driverId: 'TX-01', escortId: 'NV-01' }
                    ]
                },
                {
                    id: 'TR-9042', orderId: 'EQ-2026-1039', customer: 'CLB Ngựa Phú Thọ',
                    route: 'TP.HCM → Đà Nẵng', horses: 4, depart: '07/10/2026',
                    status: 'in_transit', assessNote: '',
                    legs: [
                        { no: 1, from: 'Trường đua Phú Thọ (TP.HCM)', to: 'Trường đua Sông Hàn (Đà Nẵng)', vehicleId: 'VH-003', driverId: 'TX-03', escortId: 'NV-02' }
                    ]
                },
                {
                    id: 'TR-9018', orderId: 'EQ-2026-1036', customer: 'Trang trại Ba Vì',
                    route: 'Ba Vì → Sóc Sơn (Hà Nội)', horses: 3, depart: '02/10/2026',
                    status: 'done', assessNote: 'Tuyến nội địa ngắn.',
                    legs: [
                        { no: 1, from: 'Trang trại Ba Vì', to: 'Trường đua Thiên Mã', vehicleId: 'VH-002', driverId: 'TX-02', escortId: 'NV-01' }
                    ]
                }
            ],
            vehicles: [
                // driverId: tài xế cố định của xe (1 tài xế ↔ 1 xe). Đổi xe → đổi tài xế theo.
                { id: 'VH-001', name: 'Xe Thùng VIP', type: 'Xe tải chuyên dụng', capacity: 2, plate: '29H-12345', status: 'in_use', maintenance: '2026-09-15', driverId: 'TX-01' },
                { id: 'VH-002', name: 'Xe Thùng Tiêu chuẩn', type: 'Xe tải chuyên dụng', capacity: 4, plate: '51C-98765', status: 'available', maintenance: '2026-09-10', driverId: 'TX-02' },
                { id: 'VH-003', name: 'Xe Thùng Lạnh', type: 'Xe tải chuyên dụng', capacity: 3, plate: '30A-55678', status: 'in_use', maintenance: '2026-09-01', driverId: 'TX-03' },
                { id: 'VH-004', name: 'Xe Container Quốc tế', type: 'Container đặc biệt', capacity: 6, plate: '51D-11122', status: 'available', maintenance: '2026-09-08', driverId: 'TX-04' },
                { id: 'VH-005', name: 'Xe Thùng VIP', type: 'Xe tải chuyên dụng', capacity: 2, plate: '43C-222.11', status: 'maintenance', maintenance: '2026-09-20', driverId: 'TX-05' },
                { id: 'VH-006', name: 'Xe Mui bạt', type: 'Xe tải chuyên dụng', capacity: 4, plate: '65C-101.22', status: 'available', maintenance: '', driverId: '' }
            ],
            staff: [
                { id: 'TX-01', name: 'Nguyễn Văn A', role: 'driver', phone: '0901 111 222' },
                { id: 'TX-02', name: 'Trần Văn B', role: 'driver', phone: '0901 333 444' },
                { id: 'TX-03', name: 'Lê Văn C', role: 'driver', phone: '0901 555 666' },
                { id: 'TX-04', name: 'Phạm Văn D', role: 'driver', phone: '0901 777 888' },
                { id: 'TX-05', name: 'Đặng Hoài Phúc', role: 'driver', phone: '0901 999 000' },
                { id: 'NV-01', name: 'Lê Thị C', role: 'escort', phone: '0902 111 222', note: 'NVCS 5 năm KN' },
                { id: 'NV-02', name: 'Võ Thị Lan', role: 'escort', phone: '0902 333 444', note: 'NVCS 3 năm KN' },
                { id: 'NV-03', name: 'Huỳnh Thị Mai', role: 'escort', phone: '0902 555 666', note: 'NVCS 2 năm KN' }
            ],
            incidents: [
                { id: 'INC-001', tripId: 'TR-9021', leg: '1/3', time: '10:30 25/10', severity: 'emergency', type: 'Y tế ngựa', desc: 'Nhịp tim bất thường, ngựa bỏ ăn trên cabin', status: 'open', proposal: '' },
                { id: 'INC-002', tripId: 'TR-9042', leg: '1/1', time: '14:15 26/10', severity: 'medium', type: 'Hỏng xe', desc: 'Xe 30A-55678 nổ lốp tại KM15 cao tốc', status: 'open', proposal: '' },
                { id: 'INC-003', tripId: 'TR-9021', leg: '2/2', time: '08:00 27/10', severity: 'low', type: 'Giao thông', desc: 'Tắc nghẽn đường tới Viêng Chăn, trễ 30p', status: 'open', proposal: '' },
                { id: 'INC-004', tripId: 'TR-9042', leg: '1/1', time: '09:00 27/10', severity: 'medium', type: 'Y tế ngựa', desc: 'Ngựa stress nhiệt, cần dừng nghỉ thêm 2 giờ', status: 'proposed', proposal: 'Dừng trạm nghỉ Tuy Hòa 2 giờ, bổ sung nước điện giải' },
                { id: 'INC-005', tripId: 'TR-9042', leg: '1/1', time: '11:20 27/10', severity: 'low', type: 'Giao thông', desc: 'Mưa lớn đoạn Quy Nhơn, giảm tốc độ', status: 'open', proposal: '' }
            ],
            activity: []
        };
    }

    // ---- Lưu trữ (trình duyệt: sessionStorage; Node: memory) ----
    let mem = null;
    function load() {
        try {
            if (typeof sessionStorage !== 'undefined') {
                const raw = sessionStorage.getItem(STORAGE_KEY);
                if (raw) return JSON.parse(raw);
                const s = seed();
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
                return s;
            }
        } catch (e) { /* bỏ qua, dùng seed */ }
        if (!mem) mem = seed();
        return mem;
    }
    function save(state) {
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                return;
            }
        } catch (e) { /* bỏ qua */ }
        mem = state;
    }
    function reset() {
        const s = seed();
        save(s);
        return s;
    }

    // ---- Truy vấn ----
    function findTrip(state, tripId) { return state.trips.find(t => t.id === tripId); }
    function queueFor(state, status) { return state.trips.filter(t => t.status === status); }
    function openIncidents(state) { return state.incidents.filter(i => i.status === 'open'); }
    function staffByRole(state, role) { return state.staff.filter(s => s.role === role); }
    function staffName(state, id) {
        const s = state.staff.find(x => x.id === id);
        return s ? s.name : '—';
    }
    function vehicleById(state, id) { return state.vehicles.find(v => v.id === id); }
    function assignmentComplete(trip) {
        // Đủ khi mọi chặng đã có xe (tài xế ăn theo xe, hộ tống tự gán theo).
        return trip.legs.length > 0 && trip.legs.every(l => l.vehicleId && l.driverId && l.escortId);
    }
    // Hộ tống tự động: người ít chặng đang phụ trách nhất (chuyến chưa xong).
    function autoEscort(state, excludeTripId) {
        const load = {};
        state.staff.filter(s => s.role === 'escort').forEach(s => { load[s.id] = 0; });
        state.trips.forEach(t => {
            if (t.status === 'done' || t.id === excludeTripId) return;
            t.legs.forEach(l => { if (l.escortId && load[l.escortId] !== undefined) load[l.escortId]++; });
        });
        let best = null;
        Object.keys(load).forEach(id => {
            if (best === null || load[id] < load[best]) best = id;
        });
        return best || '';
    }

    // ---- Chuyển trạng thái (mỗi hàm trả {ok, reason?}; chỉ đổi khi ok) ----
    function assessTrip(state, tripId, pass, note) {
        const t = findTrip(state, tripId);
        if (!t || t.status !== 'pending_assessment') return { ok: false, reason: 'not-in-queue' };
        t.status = pass ? 'awaiting_routing' : 'rejected_assessment';
        t.assessNote = note || '';
        save(state);
        return { ok: true };
    }
    function confirmRoute(state, tripId) {
        const t = findTrip(state, tripId);
        if (!t || t.status !== 'awaiting_routing') return { ok: false, reason: 'not-in-queue' };
        t.status = 'assigned';
        save(state);
        return { ok: true };
    }
    // Điều phối chỉ chọn XE: tài xế ăn theo xe (cố định), hộ tống tự gán người rảnh nhất.
    // Đổi hộ tống tay sau đó bằng assignLeg (chỉ truyền escortId).
    function assignVehicle(state, tripId, legNo, vehicleId) {
        const t = findTrip(state, tripId);
        if (!t || (t.status !== 'assigned' && t.status !== 'awaiting_routing')) return { ok: false, reason: 'wrong-status' };
        const leg = t.legs.find(l => l.no === legNo);
        const v = vehicleById(state, vehicleId);
        if (!leg || !v) return { ok: false, reason: 'no-leg-or-vehicle' };
        leg.vehicleId = vehicleId;
        leg.driverId = v.driverId || '';
        leg.escortId = autoEscort(state, tripId);
        save(state);
        return { ok: true };
    }
    function assignLeg(state, tripId, legNo, driverId, escortId, vehicleId) {
        const t = findTrip(state, tripId);
        if (!t || (t.status !== 'assigned' && t.status !== 'awaiting_routing')) return { ok: false, reason: 'wrong-status' };
        const leg = t.legs.find(l => l.no === legNo);
        if (!leg) return { ok: false, reason: 'no-leg' };
        if (driverId !== undefined) leg.driverId = driverId;
        if (escortId !== undefined) leg.escortId = escortId;
        if (vehicleId !== undefined) leg.vehicleId = vehicleId;
        save(state);
        return { ok: true };
    }
    function departTrip(state, tripId) {
        const t = findTrip(state, tripId);
        if (!t || t.status !== 'assigned') return { ok: false, reason: 'not-assigned' };
        if (!assignmentComplete(t)) return { ok: false, reason: 'incomplete-assignment' };
        t.status = 'in_transit';
        save(state);
        return { ok: true };
    }
    function reportIncident(state, data) {
        const inc = {
            id: data.id || ('INC-' + String(state.incidents.length + 1).padStart(3, '0')),
            tripId: data.tripId, leg: data.leg || '', time: data.time || '',
            severity: data.severity || 'medium', type: data.type || '',
            desc: data.desc || '', status: 'open', proposal: ''
        };
        state.incidents.push(inc);
        save(state);
        return { ok: true, id: inc.id };
    }
    // Nhật ký thao tác hiện trường (VD: tải ảnh chặng) — hiển thị ở feed Giám sát.
    function logActivity(state, text) {
        state.activity.unshift({ time: 'vừa xong', text });
        if (state.activity.length > 20) state.activity.length = 20;
        save(state);
    }
    function proposeIncident(state, incId, proposal) {
        const inc = state.incidents.find(i => i.id === incId);
        if (!inc || inc.status !== 'open') return { ok: false, reason: 'not-open' };
        if (!proposal || !proposal.trim()) return { ok: false, reason: 'empty-proposal' };
        inc.status = 'proposed';
        inc.proposal = proposal.trim();
        save(state);
        return { ok: true };
    }
    function resolveTrip(state, tripId) {
        const t = findTrip(state, tripId);
        if (!t || t.status !== 'in_transit') return { ok: false, reason: 'not-running' };
        t.status = 'done';
        save(state);
        return { ok: true };
    }

    return {
        STATUS_LABEL, INCIDENT_STATUS_LABEL, STORAGE_KEY,
        load, save, reset,
        findTrip, queueFor, openIncidents, staffByRole, staffName, vehicleById, assignmentComplete, autoEscort,
        assessTrip, confirmRoute, assignLeg, assignVehicle, departTrip, reportIncident, proposeIncident, resolveTrip, logActivity
    };
});
