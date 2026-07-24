import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import OTPVerify from './pages/auth/OTPVerify';
import LanguageSelect from './pages/auth/LanguageSelect';

// Organiser Pages
import OrganiserDashboard from './pages/organiser/Dashboard';
import CreateTournament from './pages/organiser/CreateTournament';
import ManageTournament from './pages/organiser/ManageTournament';
import TournamentDetail from './pages/organiser/TournamentDetail';
import TournamentManage from './pages/organiser/TournamentManage';

// Viewer Pages
import ViewerDashboard from './pages/viewer/Dashboard';


// Shared Pages
import TournamentView from './pages/shared/TournamentView';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">⚽</div>
        <p className="text-[var(--txt2)]">Loading...</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return children;
};

function App() {
  return (
    <Router>
      <Navbar />
      <div className="min-h-screen pt-16">
        <Routes>
          {/* Public / Auth */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<OTPVerify />} />
          <Route path="/language" element={<LanguageSelect />} />

          {/* Public Tournament View (access-controlled inside page) */}
          <Route path="/tournament/:id" element={<TournamentView />} />

          {/* Organiser Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['organiser']}>
              <OrganiserDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/create" element={
            <ProtectedRoute allowedRoles={['organiser']}>
              <CreateTournament />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/manage/:id" element={
            <ProtectedRoute allowedRoles={['organiser']}>
              <ManageTournament />
            </ProtectedRoute>
          } />
          <Route path="/organiser/tournament/:id" element={
            <ProtectedRoute allowedRoles={['organiser']}>
              <TournamentDetail />
            </ProtectedRoute>
          } />
          <Route path="/organiser/tournament/:id/manage" element={
            <ProtectedRoute allowedRoles={['organiser']}>
              <TournamentManage />
            </ProtectedRoute>
          } />

          {/* Viewer Routes */}
          <Route path="/viewer" element={
            <ProtectedRoute allowedRoles={['viewer']}>
              <ViewerDashboard />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="/unauthorized" element={
            <div className="flex items-center justify-center min-h-[80vh] text-center">
              <div>
                <div className="text-6xl mb-4">🚫</div>
                <h2 className="text-2xl font-bold mb-2">Unauthorized</h2>
                <p className="text-[var(--txt2)]">You don't have permission to view this page.</p>
              </div>
            </div>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
