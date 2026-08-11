import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Footer from './Footer';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:pl-64 min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
