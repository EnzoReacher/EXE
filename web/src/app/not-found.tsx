import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-page">
      <p className="system-kicker">404</p>
      <h1>Không tìm thấy trang.</h1>
      <p>Đường dẫn này không thuộc bản nền tảng hiện tại.</p>
      <Link href="/">Quay lại CV Compass</Link>
    </main>
  );
}
