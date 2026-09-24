// ===== Navbar dùng chung cho các trang Manager =====
// Cách dùng: đặt <div id="manager-navbar"></div> rồi ngay sau đó <script src="manager_navbar.js"></script>
// Sửa menu tại MANAGER_NAV_ITEMS, mọi trang sẽ đổi theo.

const MANAGER_NAV_ITEMS = [
    ['manager_dashboard.html', 'Bảng điều khiển'],
    ['manager_tiep_nhan.html', 'Tiếp nhận Đơn hàng'],
    ['manager_phe_duyet.html', 'Phê duyệt Đơn hàng'],
    ['manager_phan_cong.html', 'Nhân sự'],
    ['manager_trip_reports.html', 'Báo cáo Chuyến đi'],
    ['manager_duyet_su_co.html', 'Sự cố & Chi Phí']
];

(function renderManagerNavbar() {
    const currentPage = location.pathname.split('/').pop();
    const links = MANAGER_NAV_ITEMS.map(([href, label]) => href === currentPage
        ? `<li><a href="${href}" class="active" aria-current="page">${label}</a></li>`
        : `<li><a href="${href}">${label}</a></li>`
    ).join('');

    document.getElementById('manager-navbar').outerHTML = `
    <header class="main-header">
        <div class="container header-container">
            <a href="manager_dashboard.html" class="logo" style="text-decoration: none; color: inherit;">
                <div class="logo-icon-eq">EQ</div>
                <span>Vận chuyển Ngựa</span>
            </a>
            <nav class="main-nav" aria-label="Menu chính">
                <ul>${links}</ul>
            </nav>
            <div class="user-actions">
                <div class="avatar"></div>
                <span class="greeting">Quản lý</span>
                <span class="divider">|</span>
                <button class="btn-logout" onclick="window.location.href='../index.html'">Đăng xuất</button>
            </div>
        </div>
    </header>`;
})();
