// Danh sách trang của app khách: URL → trang → vai trò. Rỗng roles = công khai.
import type { AppRoute } from '@shared/routing/types'
import { SitemapPage } from '@shared/routing/SitemapPage'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import HomePage from './features/home/HomePage'
import PortalPage from './features/portal/PortalPage'
import Step1RoutePage from './features/booking/Step1RoutePage'
import Step2HorsesPage from './features/booking/Step2HorsesPage'
import Step3ServicesPage from './features/booking/Step3ServicesPage'
import Step4ReviewPage from './features/booking/Step4ReviewPage'
import OrdersPage from './features/orders/OrdersPage'
import OrderDetailPage from './features/orders/OrderDetailPage'
import AcceptancePage from './features/acceptance/AcceptancePage'
import QuotesPage from './features/quote/QuotesPage'
import TrackingPage from './features/tracking/TrackingPage'

const C = ['customer'] as AppRoute['roles']

export const routes: AppRoute[] = [
  { path: '/', page: HomePage, roles: [], title: 'Trang chủ', legacy: 'index.html', layout: 'public' },
  { path: '/login', page: LoginPage, roles: [], title: 'Đăng nhập', legacy: 'CUS/login.html', layout: 'bare' },
  { path: '/register', page: RegisterPage, roles: [], title: 'Đăng ký', legacy: 'CUS/register.html', layout: 'bare' },
  { path: '/portal', page: PortalPage, roles: C, title: 'Cổng khách hàng', legacy: 'CUS/home_auth.html', layout: 'customer' },
  { path: '/booking/route', page: Step1RoutePage, roles: C, title: 'Đặt chuyến · Tuyến đường', legacy: 'CUS/create_request.html', layout: 'customer' },
  { path: '/booking/horses', page: Step2HorsesPage, roles: C, title: 'Đặt chuyến · Thông tin ngựa', legacy: 'CUS/create_request_step2.html', layout: 'customer' },
  { path: '/booking/services', page: Step3ServicesPage, roles: C, title: 'Đặt chuyến · Dịch vụ & Y tế', legacy: 'CUS/create_request_step3.html', layout: 'customer' },
  { path: '/booking/review', page: Step4ReviewPage, roles: C, title: 'Đặt chuyến · Xác nhận', legacy: 'CUS/create_request_step4.html', layout: 'customer' },
  { path: '/orders', page: OrdersPage, roles: C, title: 'Đơn của tôi', legacy: 'CUS/don_cua_toi.html', layout: 'customer' },
  { path: '/orders/:id', page: OrderDetailPage, roles: C, title: 'Chi tiết đơn', legacy: 'CUS/don_cua_toi.html', layout: 'customer' },
  { path: '/quotes', page: QuotesPage, roles: C, title: 'Báo giá của tôi', legacy: 'CUS/bao_gia.html', layout: 'customer' },
  { path: '/tracking', page: TrackingPage, roles: C, title: 'Tra cứu lộ trình', legacy: 'CUS/tracking.html', layout: 'customer' },
  { path: '/acceptance', page: AcceptancePage, roles: C, title: 'Nghiệm thu', legacy: 'CUS/acceptance.html', layout: 'customer' },
]

routes.push({ path: '/sitemap', page: () => <SitemapPage routes={routes} appName="App khách" />, roles: [], title: 'Sitemap', layout: 'public' })
