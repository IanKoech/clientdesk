import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "ClientDesk — Work together, beautifully",
    template: "%s | ClientDesk",
  },
  description:
    "A calmer home for freelance projects, client feedback, and invoices.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
