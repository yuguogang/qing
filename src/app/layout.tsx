import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '清谱 - 三色锚线谱交互式练琴',
    template: '%s | 清谱',
  },
  description:
    '国内首款三色锚线标准五线谱交互式练琴产品。保留正统五线谱结构，通过三色视觉锚点优化识谱体验，实现练琴即识谱。',
  keywords: [
    '清谱',
    '三色锚线',
    '五线谱',
    '钢琴练琴',
    '识谱',
    '交互式练琴',
    'OSMD',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
