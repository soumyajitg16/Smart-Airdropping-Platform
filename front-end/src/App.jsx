import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import CreateAirdrop from './components/CreateAirdrop';
import AirdropsList from './components/AirdropsList';
import AirdropDetails from './components/AirdropDetails';
import ClaimToken from './components/ClaimToken';

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30">
      <Navbar />
      <main className="grow pb-24">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<CreateAirdrop />} />
            <Route path="/airdrops" element={<AirdropsList />} />
            <Route path="/airdrops/:id" element={<AirdropDetails />} />
            <Route path="/claim" element={<ClaimToken />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}