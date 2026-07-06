import { BrowserRouter, Routes, Route } from 'react-router';
import AppLayout from '../layout/AppLayout';
import CreateAirdrop from '../components/CreateAirdrop';
import AirdropsList from '../components/AirdropsList';
import AirdropDetails from '../components/AirdropDetails';
import ClaimToken from '../components/ClaimToken';
import GuidePage from '../components/GuidePage';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<CreateAirdrop />} />
          <Route path="/airdrops" element={<AirdropsList />} />
          <Route path="/airdrops/:id" element={<AirdropDetails />} />
          <Route path="/claim" element={<ClaimToken />} />
          <Route path="/guide" element={<GuidePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
