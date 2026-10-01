"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="system-page">
      <p className="system-kicker">ĐÃ XẢY RA LỖI</p>
      <h1>Trang chưa thể hiển thị.</h1>
      <p>Hãy thử lại. Nếu lỗi tiếp tục, dùng bản prototype tĩnh làm phương án demo dự phòng.</p>
      <button type="button" onClick={reset}>Thử lại</button>
    </main>
  );
}
