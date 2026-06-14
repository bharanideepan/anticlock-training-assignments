import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { AuthGuard } from './AuthGuard';
import { RoleGuard } from './RoleGuard';
import AppShell from '../shared/components/AppShell';

const ImportExportPage = lazy(() => import('../modules/import-export/ImportExportPage'));
const ActivitiesPage = lazy(() => import('../modules/activities/ActivitiesPage'));

const LoginPage = lazy(() => import('../modules/auth/LoginPage'));
const SsoCallbackPage = lazy(() => import('../modules/auth/SsoCallbackPage'));
const PasswordResetPage = lazy(() => import('../modules/auth/PasswordResetPage'));
const ChangePasswordPage = lazy(() => import('../modules/auth/ChangePasswordPage'));
const UserFormPage = lazy(() => import('../modules/users/UserFormPage'));
const UserDetailPage = lazy(() => import('../modules/users/UserDetailPage'));
const DashboardPage = lazy(() => import('../modules/dashboard/DashboardPage'));
const CustomerListPage = lazy(() => import('../modules/customers/CustomerListPage'));
const CustomerDetailPage = lazy(() => import('../modules/customers/CustomerDetailPage'));
const CustomerFormPage = lazy(() => import('../modules/customers/CustomerFormPage'));
const ContactListPage = lazy(() => import('../modules/contacts/ContactListPage'));
const ContactFormPage = lazy(() => import('../modules/contacts/ContactFormPage'));
const ContactDetailPage = lazy(() => import('../modules/contacts/ContactDetailPage'));
const OpportunityListPage = lazy(() => import('../modules/opportunities/OpportunityListPage'));
const OpportunityFormPage = lazy(() => import('../modules/opportunities/OpportunityFormPage'));
const OpportunityDetailPage = lazy(() => import('../modules/opportunities/OpportunityDetailPage'));
const PipelineBoardPage = lazy(() => import('../modules/pipeline/PipelineBoardPage'));
const TaskListPage = lazy(() => import('../modules/tasks/TaskListPage'));
const NotificationCenterPage = lazy(() => import('../modules/notifications/NotificationCenterPage'));
const ReportsPage = lazy(() => import('../modules/reports/ReportsPage'));
const AuditLogPage = lazy(() => import('../modules/audit/AuditLogPage'));
const SearchPage = lazy(() => import('../modules/search/SearchPage'));
const UserListPage = lazy(() => import('../modules/users/UserListPage'));
const AdminSettingsPage = lazy(() => import('../modules/admin/AdminSettingsPage'));
const NotFoundPage = lazy(() => import('../modules/NotFoundPage'));
const ForbiddenPage = lazy(() => import('../modules/ForbiddenPage'));

const Loading = () => (
  <Box sx={{display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px"}} >
    <CircularProgress />
  </Box>
);

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<SsoCallbackPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/change-password" element={<AuthGuard><ChangePasswordPage /></AuthGuard>} />

        {/* Protected routes wrapped in AppShell */}
        <Route path="/" element={<AuthGuard><AppShell><Navigate to="/dashboard" replace /></AppShell></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard><AppShell><DashboardPage /></AppShell></AuthGuard>} />
        <Route path="/customers" element={<AuthGuard><AppShell><CustomerListPage /></AppShell></AuthGuard>} />
        <Route path="/customers/new" element={<AuthGuard><AppShell><CustomerFormPage /></AppShell></AuthGuard>} />
        <Route path="/customers/:id" element={<AuthGuard><AppShell><CustomerDetailPage /></AppShell></AuthGuard>} />
        <Route path="/customers/:id/edit" element={<AuthGuard><AppShell><CustomerFormPage /></AppShell></AuthGuard>} />
        <Route path="/contacts" element={<AuthGuard><AppShell><ContactListPage /></AppShell></AuthGuard>} />
        <Route path="/contacts/new" element={<AuthGuard><AppShell><ContactFormPage /></AppShell></AuthGuard>} />
        <Route path="/contacts/:id" element={<AuthGuard><AppShell><ContactDetailPage /></AppShell></AuthGuard>} />
        <Route path="/contacts/:id/edit" element={<AuthGuard><AppShell><ContactFormPage /></AppShell></AuthGuard>} />
        <Route path="/opportunities" element={<AuthGuard><AppShell><OpportunityListPage /></AppShell></AuthGuard>} />
        <Route path="/opportunities/new" element={<AuthGuard><AppShell><OpportunityFormPage /></AppShell></AuthGuard>} />
        <Route path="/opportunities/:id" element={<AuthGuard><AppShell><OpportunityDetailPage /></AppShell></AuthGuard>} />
        <Route path="/opportunities/:id/edit" element={<AuthGuard><AppShell><OpportunityFormPage /></AppShell></AuthGuard>} />
        <Route path="/pipeline" element={<AuthGuard><AppShell><PipelineBoardPage /></AppShell></AuthGuard>} />
        <Route path="/tasks" element={<AuthGuard><AppShell><TaskListPage /></AppShell></AuthGuard>} />
        <Route path="/activities" element={<AuthGuard><AppShell><ActivitiesPage /></AppShell></AuthGuard>} />
        <Route path="/notifications" element={<AuthGuard><AppShell><NotificationCenterPage /></AppShell></AuthGuard>} />
        <Route path="/reports" element={<AuthGuard><AppShell><ReportsPage /></AppShell></AuthGuard>} />
        <Route path="/search" element={<AuthGuard><AppShell><SearchPage /></AppShell></AuthGuard>} />
        <Route
          path="/audit"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['SYSTEM_ADMINISTRATOR']}>
                <AppShell><AuditLogPage /></AppShell>
              </RoleGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/import-export"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER', 'SALES_REPRESENTATIVE']}>
                <AppShell><ImportExportPage /></AppShell>
              </RoleGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/users"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER']}>
                <AppShell><UserListPage /></AppShell>
              </RoleGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/users/new"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['SYSTEM_ADMINISTRATOR']}>
                <AppShell><UserFormPage /></AppShell>
              </RoleGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/users/:id"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER']}>
                <AppShell><UserDetailPage /></AppShell>
              </RoleGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['SYSTEM_ADMINISTRATOR']}>
                <AppShell><UserFormPage /></AppShell>
              </RoleGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['SYSTEM_ADMINISTRATOR']}>
                <AppShell><AdminSettingsPage /></AppShell>
              </RoleGuard>
            </AuthGuard>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
