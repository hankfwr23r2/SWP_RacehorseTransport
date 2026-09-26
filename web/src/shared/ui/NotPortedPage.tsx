// Trang giữ chỗ cho trang chưa chuyển sang React. Xóa khi mọi trang đã chuyển xong.
export function notPorted(legacy: string) {
  return function NotPortedPage() {
    return (
      <div className="page">
        <div className="wrap">
          <div className="alert alert-warning">
            <i className="fa-solid fa-person-digging" />
            <div>Trang này đang được chuyển sang React. Bản cũ vẫn chạy ở <code>{legacy}</code>.</div>
          </div>
        </div>
      </div>
    )
  }
}
