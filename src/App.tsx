import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import AuthScreen from '@/screens/AuthScreen';
import AppShell from '@/components/AppShell';
import Dashboard from '@/screens/Dashboard';
import StudentsScreen from '@/screens/StudentsScreen';
import SessionsScreen from '@/screens/SessionsScreen';
import SessionDetail from '@/screens/SessionDetail';
import AttendanceScreen from '@/screens/AttendanceScreen';
import HdmiScreen from '@/screens/HdmiScreen';
import BackupScreen from '@/screens/BackupScreen';
import CheckIn from '@/screens/CheckIn';
import { Loader2 } from 'lucide-react';

function ProtectedRoutes() {
  const { ready, session } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }
  if (!session) return <AuthScreen />;
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<StudentsScreen />} />
        <Route path="/sessions" element={<SessionsScreen />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/attendance" element={<AttendanceScreen />} />
        <Route path="/hdmi" element={<HdmiScreen />} />
        <Route path="/backup" element={<BackupScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
