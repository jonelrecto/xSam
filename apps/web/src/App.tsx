import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Auth Routes
import LoginPage from "./routes/auth/LoginPage";
import SignupPage from "./routes/auth/SignupPage";

// Public / Landing / Utility Routes
import { LandingPage } from "./routes/LandingPage";
import { MobileUploadGatewayPage } from "./routes/MobileUploadGatewayPage";

// Teacher Routes
import TeacherDashboardPage from "./routes/teacher/TeacherDashboardPage";
import NewExamPage from "./routes/teacher/NewExamPage";
import { ExamDetailPage } from "./routes/teacher/ExamDetailPage";
import { DraftStudioPage } from "./routes/teacher/DraftStudioPage";
import { ExamGradingPage } from "./routes/teacher/ExamGradingPage";
import { BankPage } from "./routes/teacher/BankPage";
import { ClassesPage } from "./routes/teacher/ClassesPage";
import { ClassDetailPage } from "./routes/teacher/ClassDetailPage";

// Student Routes
import { StudentDashboardPage } from "./routes/student/StudentDashboardPage";
import { StudentJoinPage } from "./routes/student/StudentJoinPage";
import { PreflightCheckPage } from "./routes/student/PreflightCheckPage";
import { ExamRunnerPage } from "./routes/student/ExamRunnerPage";
import { ExamDonePage } from "./routes/student/ExamDonePage";

function DefaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        XSAM Secure Exam & Proctoring Environment · Decoupled Monolithic Workspace
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/join"
        element={
          <DefaultLayout>
            <StudentJoinPage />
          </DefaultLayout>
        }
      />
      <Route
        path="/join/:code"
        element={
          <DefaultLayout>
            <StudentJoinPage />
          </DefaultLayout>
        }
      />
      <Route path="/capture/:token" element={<MobileUploadGatewayPage />} />
      <Route path="/upload-gateway/:token" element={<MobileUploadGatewayPage />} />

      {/* Teacher Routes (Protected) */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <DefaultLayout>
              <TeacherDashboardPage />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams/new"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <DefaultLayout>
              <NewExamPage />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams/:examId"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <DefaultLayout>
              <ExamDetailPage />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams/:examId/studio"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
              <DraftStudioPage />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams/:examId/questions"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
              <DraftStudioPage />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams/:examId/grading"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
              <ExamGradingPage />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/bank"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <DefaultLayout>
              <BankPage />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classes"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <DefaultLayout>
              <ClassesPage />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classes/:classId"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <DefaultLayout>
              <ClassDetailPage />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Student Routes (Protected) */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student", "admin"]}>
            <DefaultLayout>
              <StudentDashboardPage />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/exams/:examId/check"
        element={
          <ProtectedRoute allowedRoles={["student", "admin"]}>
            <DefaultLayout>
              <PreflightCheckPage />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/sessions/:sessionId"
        element={
          <ProtectedRoute allowedRoles={["student", "admin"]}>
            <ExamRunnerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/sessions/:sessionId/done"
        element={
          <ProtectedRoute allowedRoles={["student", "admin"]}>
            <DefaultLayout>
              <ExamDonePage />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
