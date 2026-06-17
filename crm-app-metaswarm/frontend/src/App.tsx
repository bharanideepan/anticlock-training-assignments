import { Suspense, lazy } from 'react';
import { ThemeProvider, CssBaseline, createTheme, CircularProgress, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './guards/AuthGuard';
import { RoleGuard } from './guards/RoleGuard';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SsoCallbackPage = lazy(() => import('./pages/auth/SsoCallbackPage'));
const PasswordResetPage = lazy(() => import('./pages/auth/PasswordResetPage'));
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'));
const UserListPage = lazy(() => import('./pages/users/UserListPage'));
const UserFormPage = lazy(() => import('./pages/users/UserFormPage'));
const UserDetailPage = lazy(() => import('./pages/users/UserDetailPage'));
const CustomerListPage = lazy(() => import('./pages/customers/CustomerListPage'));
const CustomerFormPage = lazy(() => import('./pages/customers/CustomerFormPage'));
const CustomerDetailPage = lazy(() => import('./pages/customers/CustomerDetailPage'));
const ContactListPage = lazy(() => import('./pages/contacts/ContactListPage'));
const ContactFormPage = lazy(() => import('./pages/contacts/ContactFormPage'));
const ContactDetailPage = lazy(() => import('./pages/contacts/ContactDetailPage'));
const ActivityListPage = lazy(() => import('./pages/activities/ActivityListPage'));
const ActivityFormPage = lazy(() => import('./pages/activities/ActivityFormPage'));
const ActivityDetailPage = lazy(() => import('./pages/activities/ActivityDetailPage'));
const OpportunityListPage = lazy(() => import('./pages/opportunities/OpportunityListPage'));
const OpportunityFormPage = lazy(() => import('./pages/opportunities/OpportunityFormPage'));
const OpportunityDetailPage = lazy(() => import('./pages/opportunities/OpportunityDetailPage'));
const PipelineBoardPage = lazy(() => import('./pages/pipeline/PipelineBoardPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const NotificationCenterPage = lazy(() => import('./pages/notifications/NotificationCenterPage'));
const TaskListPage = lazy(() => import('./pages/tasks/TaskListPage'));
const TaskFormPage = lazy(() => import('./pages/tasks/TaskFormPage'));
const TaskDetailPage = lazy(() => import('./pages/tasks/TaskDetailPage'));

const theme = createTheme();
const queryClient = new QueryClient();

const Loading = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

const USER_MGMT_ROLES = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER'];
const ADMIN_ONLY = ['SYSTEM_ADMINISTRATOR'];
const CUSTOMER_ROLES = [
  'SYSTEM_ADMINISTRATOR',
  'SALES_MANAGER',
  'SALES_REPRESENTATIVE',
  'SUPPORT_REPRESENTATIVE',
  'READ_ONLY',
];
const CUSTOMER_WRITE_ROLES = ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE'];
const ACTIVITY_WRITE_ROLES = [
  'SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE', 'SUPPORT_REPRESENTATIVE',
];

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
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/notifications" element={<NotificationCenterPage />} />

                  {/* Users & Teams — ADMIN + MANAGER view */}
                  <Route element={<RoleGuard allowedRoles={USER_MGMT_ROLES} />}>
                    <Route path="/users" element={<UserListPage />} />
                    <Route path="/users/:id" element={<UserDetailPage />} />
                  </Route>

                  {/* Users — ADMIN create/edit */}
                  <Route element={<RoleGuard allowedRoles={ADMIN_ONLY} />}>
                    <Route path="/users/new" element={<UserFormPage />} />
                    <Route path="/users/:id/edit" element={<UserFormPage />} />
                  </Route>

                  {/* Customers — all authenticated roles can view */}
                  <Route element={<RoleGuard allowedRoles={CUSTOMER_ROLES} />}>
                    <Route path="/customers" element={<CustomerListPage />} />
                    <Route path="/customers/:id" element={<CustomerDetailPage />} />
                  </Route>

                  {/* Customers — create/edit/archive (write roles only) */}
                  <Route element={<RoleGuard allowedRoles={CUSTOMER_WRITE_ROLES} />}>
                    <Route path="/customers/new" element={<CustomerFormPage />} />
                    <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
                  </Route>

                  {/* Contacts — all roles can view */}
                  <Route element={<RoleGuard allowedRoles={CUSTOMER_ROLES} />}>
                    <Route path="/contacts" element={<ContactListPage />} />
                    <Route path="/contacts/:id" element={<ContactDetailPage />} />
                  </Route>

                  {/* Contacts — write roles */}
                  <Route element={<RoleGuard allowedRoles={CUSTOMER_WRITE_ROLES} />}>
                    <Route path="/contacts/new" element={<ContactFormPage />} />
                    <Route path="/contacts/:id/edit" element={<ContactFormPage />} />
                  </Route>

                  {/* Activities — all roles can view */}
                  <Route element={<RoleGuard allowedRoles={CUSTOMER_ROLES} />}>
                    <Route path="/activities" element={<ActivityListPage />} />
                    <Route path="/activities/:id" element={<ActivityDetailPage />} />
                  </Route>

                  {/* Activities — write roles */}
                  <Route element={<RoleGuard allowedRoles={ACTIVITY_WRITE_ROLES} />}>
                    <Route path="/activities/new" element={<ActivityFormPage />} />
                    <Route path="/activities/:id/edit" element={<ActivityFormPage />} />
                  </Route>

                  {/* Opportunities — all roles can view */}
                  <Route element={<RoleGuard allowedRoles={CUSTOMER_ROLES} />}>
                    <Route path="/opportunities" element={<OpportunityListPage />} />
                    <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
                    <Route path="/pipeline" element={<PipelineBoardPage />} />
                  </Route>

                  {/* Opportunities — write roles */}
                  <Route element={<RoleGuard allowedRoles={CUSTOMER_WRITE_ROLES} />}>
                    <Route path="/opportunities/new" element={<OpportunityFormPage />} />
                    <Route path="/opportunities/:id/edit" element={<OpportunityFormPage />} />
                  </Route>

                  {/* Tasks — all roles can view */}
                  <Route element={<RoleGuard allowedRoles={CUSTOMER_ROLES} />}>
                    <Route path="/tasks" element={<TaskListPage />} />
                    <Route path="/tasks/:id" element={<TaskDetailPage />} />
                  </Route>

                  {/* Tasks — write roles */}
                  <Route element={<RoleGuard allowedRoles={ACTIVITY_WRITE_ROLES} />}>
                    <Route path="/tasks/new" element={<TaskFormPage />} />
                    <Route path="/tasks/:id/edit" element={<TaskFormPage />} />
                  </Route>
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
