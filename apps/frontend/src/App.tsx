import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PersonsPage from './pages/PersonsPage';
import AddressesPage from './pages/AddressesPage';
import PeoplePage from './pages/PeoplePage';
import CdcPage from './pages/CdcPage';
import ChatterPage from './pages/ChatterPage';
import McpPage from './pages/McpPage';
import OpenApiPage from './pages/OpenApiPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/persons" replace />} />
          <Route path="persons" element={<PersonsPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="cdc" element={<CdcPage />} />
          <Route path="chat" element={<ChatterPage />} />
          <Route path="mcp" element={<McpPage />} />
          <Route path="openapi" element={<OpenApiPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
