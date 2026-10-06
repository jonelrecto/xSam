import { eq } from "drizzle-orm";
import { db, examSessions, studentAnswers, questions, type Question } from "@xsam/db";

export function normalizeAnswer(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluateQuestion(
  q: Question,
  studentAnswerText: string | null | undefined
): { isCorrect: boolean | null; pointsAwarded: number | null } {
  if (!studentAnswerText || studentAnswerText.trim() === "") {
    if (q.type === "essay") return { isCorrect: null, pointsAwarded: null };
    return { isCorrect: false, pointsAwarded: 0 };
  }

  const maxPoints = Number(q.points) || 1.0;

  switch (q.type) {
    case "multiple_choice": {
      const correctKey = (q.answers[0] || "").trim().toLowerCase();
      const studentVal = studentAnswerText.trim().toLowerCase();
      const isCorrect = correctKey === studentVal;
      return {
        isCorrect,
        pointsAwarded: isCorrect ? maxPoints : 0,
      };
    }

    case "true_false": {
      const correctKey = (q.answers[0] || "").trim().toLowerCase();
      const studentVal = studentAnswerText.trim().toLowerCase();
      const isCorrect = correctKey === studentVal;
      return {
        isCorrect,
        pointsAwarded: isCorrect ? maxPoints : 0,
      };
    }

    case "identification": {
      const normalizedStudent = normalizeAnswer(studentAnswerText);
      const normalizedKeys = q.answers.map((k) => normalizeAnswer(k));
      const isCorrect = normalizedKeys.includes(normalizedStudent);
      return {
        isCorrect,
        pointsAwarded: isCorrect ? maxPoints : 0,
      };
    }

    case "essay":
      return {
        isCorrect: null,
        pointsAwarded: null,
      };

    default:
      return { isCorrect: false, pointsAwarded: 0 };
  }
}

export async function gradeSession(sessionId: string) {
  const session = await db.query.examSessions.findFirst({
    where: eq(examSessions.id, sessionId),
  });
  if (!session) return null;

  const examQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, session.examId));

  const existingAnswers = await db
    .select()
    .from(studentAnswers)
    .where(eq(studentAnswers.sessionId, sessionId));

  const answersMap = new Map(existingAnswers.map((a) => [a.questionId, a]));

  let totalScore = 0;
  let maxScore = 0;
  let hasPendingManualGrades = false;

  for (const q of examQuestions) {
    const qPoints = Number(q.points) || 1.0;
    maxScore += qPoints;

    const recorded = answersMap.get(q.id);

    if (recorded && recorded.manualGrade && recorded.pointsAwarded !== null) {
      totalScore += Number(recorded.pointsAwarded);
      continue;
    }

    if (q.type === "essay") {
      hasPendingManualGrades = true;
      if (recorded && recorded.pointsAwarded !== null) {
        totalScore += Number(recorded.pointsAwarded);
      }
      continue;
    }

    const { isCorrect, pointsAwarded } = evaluateQuestion(
      q,
      recorded?.answerText
    );

    if (isCorrect && pointsAwarded !== null) {
      totalScore += pointsAwarded;
    }

    if (recorded) {
      await db
        .update(studentAnswers)
        .set({
          isCorrect,
          pointsAwarded: pointsAwarded !== null ? String(pointsAwarded) : null,
          updatedAt: new Date(),
        })
        .where(eq(studentAnswers.id, recorded.id));
    }
  }

  const fullyGraded = !hasPendingManualGrades;

  await db
    .update(examSessions)
    .set({
      score: String(totalScore),
      maxScore: String(maxScore),
      gradedAt: new Date(),
      fullyGraded,
    })
    .where(eq(examSessions.id, sessionId));

  return {
    score: totalScore,
    maxScore,
    fullyGraded,
  };
}
