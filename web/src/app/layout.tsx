import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV Compass — Đọc rõ khoảng cách CV và công việc",
  description:
    "Công cụ thử nghiệm giúp sinh viên đối chiếu CV với một mô tả công việc và xem bằng chứng đang có trong hồ sơ.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
