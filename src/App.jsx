import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { IncidentListPage } from './pages/IncidentListPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<IncidentListPage />} />
            <Route path="/incident/:id" element={<IncidentDetailPage />} />
            {/* Fallback to home page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
