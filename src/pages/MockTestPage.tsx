import { Outlet } from 'react-router-dom';
import { MockTestProvider } from '@/context/MockTestContext';

export default function MockTestPage() {
  return (
    <MockTestProvider>
      <Outlet />
    </MockTestProvider>
  );
}