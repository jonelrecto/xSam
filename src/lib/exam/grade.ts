import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  examSessions,
  studentAnswers,
  questions,
  type Question,
  type StudentAnswer,
} from "@/lib/db/schema";

/**
 * NFKC Normalizer for Student Answers and Identification Keys
 * Strips punctuation, diacritics, case variances, and redundant whitespace.
 */
export function normalizeAnswer(text: string | null | undefined): string {
  if (!text) return "";

  return text
    // Decompose characters into base + combining diacritical marks
    .normalize("NFD")
    // Remove combining diacritical marks (e.g. accents, tildes)
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFKC")
    .toLowerCase()
    // Strip common punctuation (e.g. "R.A. 9003" -> "ra 9003")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, "")
    // Collapse all whitespace sequences into a single space
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
      // Subjective essays are scored manually by instructors
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

    // If teacher already manually graded this answer, preserve their score
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
