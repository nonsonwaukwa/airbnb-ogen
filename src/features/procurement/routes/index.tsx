import { RouteObject } from 'react-router-dom';
import ProcurementPage from './ProcurementPage';
import ProcurementViewPage from './ProcurementViewPage';

export const procurementRoutes: RouteObject[] = [
  {
    path: '/procurement',
    element: <ProcurementPage />,
  },
  {
    path: '/procurement/:id',
    element: <ProcurementViewPage />,
  },
]; 
 
 