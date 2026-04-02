import { Routes, Route, Navigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

import ProtectedRoute    from './components/ProtectedRoute'
import AdminLayout       from './layouts/AdminLayout'
import ClinicianLayout   from './layouts/ClinicianLayout'

// ── Pages ─────────────────────────────────────────────────────────────────────
import LoginPage             from './pages/LoginPage'
import ResetPasswordPage     from './pages/ResetPasswordPage'
import NotFoundPage          from './pages/NotFoundPage'

// Clinician pages
import ClinicianDashboardPage   from './pages/clinician/DashboardPage'
import ClinicianPatientsPage    from './pages/clinician/PatientsPage'
import PatientDetailPage        from './pages/clinician/PatientDetailPage'
import AddPatientPage           from './pages/clinician/AddPatientPage'
import CreateAssessmentPage     from './pages/CreateAssessmentPage'
import AssessmentDetailPage     from './pages/AssessmentDetailPage'

// Admin pages
import AdminDashboardPage       from './pages/admin/DashboardPage'
import AdminPatientsPage        from './pages/admin/PatientsPage'
import AdminCliniciansPage      from './pages/admin/CliniciansPage'
import AddClinicianPage         from './pages/admin/AddClinicianPage'

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────────────── */}
      <Route path="/sign-in" element={<LoginPage />} />
      <Route path="/"        element={<Navigate to="/dashboard" replace />} />

      {/* ── Admin routes (must be before clinician — both share path "/dashboard" etc.) */}
      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route element={<AdminLayout />}>
          <Route path="dashboard"                         element={<AdminDashboardPage />} />
          <Route path="patients"                          element={<AdminPatientsPage />} />
          <Route path="patients/new"                      element={<AddPatientPage />} />
          <Route path="patients/:id"                      element={<PatientDetailPage />} />
          <Route path="patients/:id/assessments/new"      element={<CreateAssessmentPage />} />
          <Route path="assessments/:id"                   element={<AssessmentDetailPage />} />
          <Route path="clinicians"                        element={<AdminCliniciansPage />} />
          <Route path="clinicians/new"                    element={<AddClinicianPage />} />
          <Route path="settings/reset-password"           element={<ResetPasswordPage />} />
        </Route>
      </Route>

      {/* ── Clinician routes ───────────────────────────────────────────── */}
      <Route element={<ProtectedRoute requiredRole="clinician" />}>
        <Route element={<ClinicianLayout />}>
          <Route path="dashboard"                         element={<ClinicianDashboardPage />} />
          <Route path="patients"                          element={<ClinicianPatientsPage />} />
          <Route path="patients/new"                      element={<AddPatientPage />} />
          <Route path="patients/:id"                      element={<PatientDetailPage />} />
          <Route path="patients/:id/assessments/new"      element={<CreateAssessmentPage />} />
          <Route path="assessments/:id"                   element={<AssessmentDetailPage />} />
          <Route path="settings/reset-password"           element={<ResetPasswordPage />} />
        </Route>
      </Route>

      {/* ── 404 ────────────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
