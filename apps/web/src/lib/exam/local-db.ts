import Dexie, { type Table } from "dexie";

export interface LocalAnswer {
  id?: number;
  sessionId: string;
  questionId: string;
  answerText: string;
  clientTs: number;
  synced: number; // 0 = false, 1 = true
}

export class ExamLocalDatabase extends Dexie {
  answers!: Table<LocalAnswer, number>;

  constructor() {
    super("XsamExamLocalDB");
    this.version(1).stores({
      answers: "++id, sessionId, questionId, synced, [sessionId+questionId]",
    });
  }
}

export const localDb = typeof window !== "undefined" ? new ExamLocalDatabase() : null;
