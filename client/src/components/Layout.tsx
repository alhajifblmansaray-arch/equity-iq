import { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">{children}</main>
    </div>
  );
}
