import './globals.css';

export const metadata = {
  title: 'AdFlow Studio',
  description: '从产品链接到口播视频的 AI 广告工作台',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
