// Danh sách trang của app nội bộ: URL → trang → vai trò.
import type { AppRoute } from '@shared/routing/types'
import { SitemapPage } from '@shared/routing/SitemapPage'
import { notPorted } from '@shared/ui/NotPortedPage'
import { ManagerLoginPage, StaffLoginPage } from './features/auth/StaffLoginPage'
import IntakePage from './features/manager/intake/IntakePage'
import ApprovalsPage from './features/manager/approvals/ApprovalsPage'
import StaffPage from './features/manager/staff/StaffPage'
import DashboardPage from './features/manager/dashboard/DashboardPage'
import TripReportsPage from './features/manager/trip-reports/TripReportsPage'
import IncidentsPage from './features/manager/incidents/IncidentsPage'

const M: AppRoute['roles'] = ['manager']
const SP: AppRoute['roles'] = ['specialist']
const CO: AppRoute['roles'] = ['coordinator']

const r = (path: string, roles: AppRoute['roles'], title: string, legacy: string, layout: AppRoute['layout'] = 'staff'): AppRoute =>
  ({ path, page: notPorted(legacy), roles, title, legacy, layout })

export const routes: AppRoute[] = [
  { path: '/login', page: StaffLoginPage, roles: [], title: 'Đăng nhập nội bộ', legacy: 'Staffs/staff_login.html', layout: 'bare' },
  { path: '/manager/login', page: ManagerLoginPage, roles: [], title: 'Đăng nhập Quản lý', legacy: 'Manager/manager_login.html', layout: 'bare' },

  { path: '/manager', page: DashboardPage, roles: M, title: 'Bảng điều khiển', legacy: 'Manager/manager_dashboard.html', layout: 'staff' },
  { path: '/manager/intake', page: IntakePage, roles: M, title: 'Tiếp nhận Đơn hàng', legacy: 'Manager/manager_tiep_nhan.html', layout: 'staff' },
  { path: '/manager/approvals', page: ApprovalsPage, roles: M, title: 'Phê duyệt Đơn hàng', legacy: 'Manager/manager_phe_duyet.html', layout: 'staff' },
  { path: '/manager/staff', page: StaffPage, roles: M, title: 'Nhân sự & Điều chuyển', legacy: 'Manager/manager_phan_cong.html', layout: 'staff' },
  { path: '/manager/trip-reports', page: TripReportsPage, roles: M, title: 'Báo cáo Chuyến đi', legacy: 'Manager/manager_trip_reports.html', layout: 'staff' },
  { path: '/manager/incidents', page: IncidentsPage, roles: M, title: 'Sự cố & Chi phí', legacy: 'Manager/manager_duyet_su_co.html', layout: 'staff' },

  r('/specialist/document-check', SP, 'Danh mục Kiểm dịch', 'Specialist/CUS2_KiemDich.html'),
  r('/specialist/quarantine/:id', SP, 'Chi tiết Kiểm dịch', 'Specialist/chi-tiet-kiem-dich.html'),
  r('/specialist/trip-papers', SP, 'Chuẩn bị giấy tờ chuyến đi', 'Specialist/CUS2_Policy_List.html'),
  r('/specialist/legal-docs/:id', SP, 'Hồ sơ Hải quan & Pháp lý', 'Specialist/CUS2_Policy.html'),

  r('/coordinator/assessment', CO, 'Đánh giá khả thi', 'Fleet And Route/OPS-03.html'),
  r('/coordinator/incidents', CO, 'Xử lý sự cố', 'Fleet And Route/OPS-04.html'),
  r('/coordinator/routing', CO, 'Lập lộ trình', 'Fleet And Route/OPS-05.html'),
  r('/coordinator/monitoring', CO, 'Giám sát chuyến', 'Fleet And Route/OPS-06.html'),
  r('/coordinator/fleet', CO, 'Đội xe', 'Fleet And Route/OPS-07.html'),
  r('/coordinator/assignment', CO, 'Phân công nhân sự', 'Fleet And Route/OPS-08.html'),
  r('/coordinator/staff/:id', CO, 'Chi tiết nhân sự', 'Fleet And Route/chi-tiet-nhan-su.html'),

  r('/driver', ['driver'], 'Chuyến của tôi', 'Driver/index.html', 'mobile'),
  r('/escort', ['escort'], 'Nhật ký sức khỏe ngựa', 'Escort/escort_page.html', 'mobile'),
]

routes.push({ path: '/sitemap', page: () => <SitemapPage routes={routes} appName="App nội bộ" />, roles: [], title: 'Sitemap', layout: 'staff' })
