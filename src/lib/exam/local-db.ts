import Dexie, { type Table } from "dexie";
import type { StudentQuestion } from "./paper";

export interface LocalAnswer {
  id?: number;
  sessionId: string;
  questionId: string;
  answerText: string;
  clientTs: number;
  synced: number; // 0 = unsynced, 1 = synced
}

export interface LocalPaper {
  sessionId: string;
  examId: string;
  deadlineAt: string;
  questions: StudentQuestion[];
  updatedAt: number;
}

export class ExamLocalDatabase extends Dexie {
  answers!: Table<LocalAnswer, number>;
  papers!: Table<LocalPaper, string>;

  constructor() {
    super("sepe-exam");
    this.version(1).stores({
      answers: "++id, [sessionId+questionId], sessionId, questionId, synced",
      papers: "sessionId, examId",
    });
  }
}

export const localDb =
  typeof window !== "undefined" ? new ExamLocalDatabase() : (null as any);
