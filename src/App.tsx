import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Layout } from '@/components/layouts/Layout';
import { Toaster } from '@/components/ui/sonner';

import { routes } from './routes';

const App: React.FC = () => {
  return (
    <Router>
      <IntersectObserver />
      <Layout>
        <Routes>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
          <Route path="*" element={<Navigate to="/embed" replace />} />
        </Routes>
      </Layout>
      <Toaster position="top-center" />
    </Router>
  );
};

export default App;
