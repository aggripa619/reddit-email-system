import type { Metadata } from 'next';
import './globals.css';
import SidebarNav from '@/components/SidebarNav';

export const metadata: Metadata = {
  title: 'Reddit DM — AnswerInsight',
  description: 'Automated Reddit DM drafting with human approval',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', minHeight: '100vh', margin: 0 }}>
        <SidebarNav />
        <main style={{ flex: 1, minHeight: '100vh' }}>{children}</main>
      </body>
    </html>
  );
}
