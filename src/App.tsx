import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppStore } from './store';
import ModeSelectPage from './pages/ModeSelectPage';
import NewProjectPage from './pages/NewProjectPage';
import InventoryPage from './pages/InventoryPage';
import RulesPage from './pages/RulesPage';
import ScanningPage from './pages/ScanningPage';
import ResultsPage from './pages/ResultsPage';
import FindingDetailPage from './pages/FindingDetailPage';
import FixDiffPage from './pages/FixDiffPage';
import ExportPage from './pages/ExportPage';

function NeedProject({ children }: { children: ReactNode }) {
  const project = useAppStore((s) => s.project);
  if (!project) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ModeSelectPage />} />
      <Route path="/project/new" element={<NewProjectPage />} />
      <Route
        path="/inventory"
        element={
          <NeedProject>
            <InventoryPage />
          </NeedProject>
        }
      />
      <Route
        path="/rules"
        element={
          <NeedProject>
            <RulesPage />
          </NeedProject>
        }
      />
      <Route
        path="/scanning"
        element={
          <NeedProject>
            <ScanningPage />
          </NeedProject>
        }
      />
      <Route
        path="/results"
        element={
          <NeedProject>
            <ResultsPage />
          </NeedProject>
        }
      />
      <Route
        path="/findings/:id"
        element={
          <NeedProject>
            <FindingDetailPage />
          </NeedProject>
        }
      />
      <Route
        path="/fix"
        element={
          <NeedProject>
            <FixDiffPage />
          </NeedProject>
        }
      />
      <Route
        path="/export"
        element={
          <NeedProject>
            <ExportPage />
          </NeedProject>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
