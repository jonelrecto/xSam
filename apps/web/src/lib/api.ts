export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const res = await fetch(endpoint, {
    credentials: "include",
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data?.error || `Request failed with status ${res.status}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export const teacherApi = {
  getExams: () => apiFetch<any[]>("/api/teacher/exams"),
  getExam: (examId: string) => apiFetch<any>(`/api/teacher/exams/${examId}`),
  createExam: (data: any) =>
    apiFetch<{ ok: boolean; id: string }>("/api/teacher/exams", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateExamDetails: (examId: string, data: any) =>
    apiFetch<{ ok: boolean }>(`/api/teacher/exams/${examId}/details`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  saveDraftQuestions: (examId: string, questions: any[]) =>
    apiFetch<{ ok: boolean; version: number; idMap: any[] }>(
      `/api/teacher/exams/${examId}/questions/batch`,
      {
        method: "POST",
        body: JSON.stringify(questions),
      }
    ),
  publishExam: (examId: string) =>
    apiFetch<{ ok: boolean; accessCode: string; status: string }>(
      `/api/teacher/exams/${examId}/publish`,
      {
        method: "POST",
      }
    ),
  deleteExam: (examId: string) =>
    apiFetch<{ ok: boolean }>(`/api/teacher/exams/${examId}`, {
      method: "DELETE",
    }),
  getAnalytics: (examId: string) =>
    apiFetch<any>(`/api/teacher/exams/${examId}/analytics`),
  getResults: (examId: string) =>
    apiFetch<any[]>(`/api/teacher/exams/${examId}/results`),
  getGradingQueue: (examId: string) =>
    apiFetch<any[]>(`/api/teacher/exams/${examId}/grading-queue`),
  gradeAnswer: (data: { sessionId: string; questionId: string; pointsAwarded: number; isCorrect?: boolean }) =>
    apiFetch<{ ok: boolean; sessionScore: number; maxScore: number; fullyGraded: boolean }>(
      "/api/teacher/grading/grade-answer",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
  getBankQuestions: (params?: { categoryId?: string; search?: string; type?: string }) => {
    const sp = new URLSearchParams();
    if (params?.categoryId && params.categoryId !== "all" && params.categoryId !== "undefined") {
      sp.set("categoryId", params.categoryId);
    }
    if (params?.type && params.type !== "all" && params.type !== "undefined") {
      sp.set("type", params.type);
    }
    if (params?.search && params.search.trim() && params.search !== "undefined") {
      sp.set("search", params.search.trim());
    }
    const query = sp.toString();
    return apiFetch<any[]>(`/api/teacher/bank${query ? `?${query}` : ""}`);
  },
  createBankQuestion: (data: any) =>
    apiFetch<{ ok: boolean; id: string }>("/api/teacher/bank", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteBankQuestion: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/teacher/bank/${id}`, {
      method: "DELETE",
    }),
  getCategories: () => apiFetch<any[]>("/api/teacher/categories"),
  createCategory: (data: any) =>
    apiFetch<{ ok: boolean; category: any }>("/api/teacher/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getClasses: () => apiFetch<any[]>("/api/teacher/classes"),
  getClass: (classId: string) => apiFetch<any>(`/api/teacher/classes/${classId}`),
  createClass: (data: any) =>
    apiFetch<{ ok: boolean; class: any }>("/api/teacher/classes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addStudentToClass: (classId: string, data: { studentEmail: string; studentNumber?: string }) =>
    apiFetch<{ ok: boolean }>(`/api/teacher/classes/${classId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAssignedClasses: (examId: string) =>
    apiFetch<any[]>(`/api/teacher/exams/${examId}/classes`),
  assignClasses: (examId: string, classIds: string[]) =>
    apiFetch<{ ok: boolean }>(`/api/teacher/exams/${examId}/classes`, {
      method: "POST",
      body: JSON.stringify({ classIds }),
    }),
  getImportQuota: () => apiFetch<any>("/api/teacher/import/quota"),
  importDocument: async (examId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/teacher/exams/${examId}/import-document`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to import document");
    return data;
  },
};

export const studentApi = {
  lookupExam: (query: string | { accessCode?: string; examId?: string }) => {
    const body = typeof query === "string" ? { accessCode: query } : query;
    return apiFetch<{ ok: boolean; exam: any }>("/api/student/lookup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  getPreflight: (examId: string) =>
    apiFetch<{ ok: boolean; exam: any }>(`/api/student/exams/${examId}/preflight`),
  startSession: (examId: string, consentVersion?: string) =>
    apiFetch<{ ok: boolean; sessionId: string; deadlineAt: string; status: string }>(
      "/api/student/sessions/start",
      {
        method: "POST",
        body: JSON.stringify({ examId, consentVersion }),
      }
    ),
  getPaper: (sessionId: string) =>
    apiFetch<{ ok: boolean; session: any; exam: any; paper: any[]; savedAnswers: any[] }>(
      `/api/student/sessions/${sessionId}/paper`
    ),
  submitSession: (sessionId: string, reason?: "student" | "timeout") =>
    apiFetch<{ ok: boolean; score: number | null; maxScore: number | null; showScore: boolean }>(
      `/api/student/sessions/${sessionId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    ),
  getSessionsHistory: () => apiFetch<any[]>("/api/student/sessions"),
};
