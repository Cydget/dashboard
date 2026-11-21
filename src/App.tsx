import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardProvider } from './context/DashboardContext';
import Settings from './pages/Settings';
import Home from './pages/Home';
import HealthCheck from './pages/HealthCheck';

export default function App() {
  return (
    <DashboardProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/health" element={<HealthCheck />} />
          <Route path="/healthcheck" element={<HealthCheck />} />
        </Routes>
      </BrowserRouter>
    </DashboardProvider>
  );
}
