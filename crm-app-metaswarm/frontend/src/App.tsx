import { Suspense, lazy } from 'react';
import { ThemeProvider, CssBaseline, createTheme, CircularProgress, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './guards/AuthGuard';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SsoCallbackPage = lazy(() => import('./pages/auth/SsoCallbackPage'));
const PasswordResetPage = lazy(() => import('./pages/auth/PasswordResetPage'));
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'));

const theme = createTheme();
const queryClient = new QueryClient();

const Loading = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<Loading />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/sso/callback" element={<SsoCallbackPage />} />
                <Route path="/auth/password-reset" element={<PasswordResetPage />} />

                {/* Protected routes */}
                <Route element={<AuthGuard />}>
                  <Route path="/profile/change-password" element={<ChangePasswordPage />} />
                  <Route path="/" element={<div>Dashboard — coming soon</div>} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
