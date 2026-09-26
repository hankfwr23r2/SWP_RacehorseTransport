// Danh sách mọi trang của app, sinh tự động từ routes (thay cho sitemap.html cũ).
import { Link } from 'react-router'
import { ROLE_LABEL } from '../types/role'
import type { AppRoute } from './types'

export function SitemapPage({ routes, appName }: { routes: AppRoute[]; appName: string }) {
  return (
    <div className="page">
      <div className="wrap">
        <div className="page-header">
          <h1>Sitemap — {appName}</h1>
          <p>Mọi trang của app, vai trò được vào và trang HTML cũ tương ứng.</p>
        </div>
        <div className="card table-wrap">
          <table className="data-table">
            <thead><tr><th>Trang</th><th>URL</th><th>Vai trò</th><th>Trang HTML cũ</th></tr></thead>
            <tbody>
              {routes.filter(r => !r.path.includes(':') && r.path !== '/sitemap').map(r => (
                <tr key={r.path}>
                  <td className="font-semibold"><Link to={r.path} className="text-orange">{r.title}</Link></td>
                  <td><code>{r.path}</code></td>
                  <td>{r.roles.length ? r.roles.map(x => ROLE_LABEL[x]).join(', ') : 'Công khai'}</td>
                  <td className="text-muted small">{r.legacy ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
