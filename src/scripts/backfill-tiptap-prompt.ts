import "dotenv/config";
import { db } from "../lib/db/index";
import { questions } from "../lib/db/schema";
import { plainTextToTiptap } from "../lib/editor/converters";
import { eq } from "drizzle-orm";

async function backfillPromptJson() {
  console.log("Running Tiptap prompt_json backfill...");

  const allQuestions = await db.select().from(questions);
  console.log(`Found ${allQuestions.length} total questions.`);

  let updatedCount = 0;
  for (const q of allQuestions) {
    if (!q.promptJson || q.underlined) {
      const generated = plainTextToTiptap(q.prompt, q.underlined);
      await db
        .update(questions)
        .set({ promptJson: generated })
        .where(eq(questions.id, q.id));
      updatedCount++;
    }
  }

  console.log(`Successfully backfilled ${updatedCount} questions with Tiptap JSON.`);
}

backfillPromptJson()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
