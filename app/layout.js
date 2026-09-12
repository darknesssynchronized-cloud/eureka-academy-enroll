import './globals.css';

export const metadata = {
  title: 'EUREKA ACADEMY - ระบบลงทะเบียน',
  description: 'ระบบลงทะเบียนเรียนคอร์สออนไลน์ของ EUREKA ACADEMY',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <span className="brand">EUREKA ACADEMY</span>
            <nav className="nav">
              <a href="/">หน้าหลัก</a>
              <a href="/enroll">ลงทะเบียนเรียน</a>
              <a href="/history">ประวัติการลงทะเบียน</a>
            </nav>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}
