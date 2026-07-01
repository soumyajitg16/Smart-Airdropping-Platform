import { Outlet } from 'react-router';
import Navbar from '../components/Navbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30">
      <Navbar />
      <main className="grow pb-24">
        <Outlet />
      </main>
    </div>
  );
}
