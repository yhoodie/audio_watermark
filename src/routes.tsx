import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import EmbedPage from './pages/EmbedPage';
import ExtractPage from './pages/ExtractPage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: '水印嵌入',
    path: '/embed',
    element: <EmbedPage />,
    public: true,
  },
  {
    name: '水印提取',
    path: '/extract',
    element: <ExtractPage />,
    public: true,
  },
  {
    name: '首页',
    path: '/',
    element: <Navigate to="/embed" replace />,
    public: true,
  },
];
