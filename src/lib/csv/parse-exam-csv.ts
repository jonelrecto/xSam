import Papa from "papaparse";
import readXlsxFile from "read-excel-file/node";
import type { DraftQuestion } from "@xsam/shared";
import { plainTextToTiptap } from "@xsam/shared";

export const MAX_ROWS = 200;
export const MAX_BYTES = 1_000_000;
const REQUIRED_COLUMNS = ["type", "prompt", "answer"];

export type CsvIssue = {
  row: number | null;
  column?: string;
  message: string;
  severity: "error" | "warning";
};

export type CsvParseResult = {
  questions: DraftQuestion[];
  issues: CsvIssue[];
  totalRows: number;
  invalidRows: number;
};

const TYPE_ALIASES: Record<string, DraftQuestion["type"]> = {
  multiple_choice: "multiple_choice",
  mcq: "multiple_choice",
  mc: "multiple_choice",
  true_false: "true_false",
  tf: "true_false",
  "true/false": "true_false",
  identification: "identification",
  id: "identification",
  essay: "essay",
};

const OPTION_KEYS = ["opt_a", "opt_b", "opt_c", "opt_d", "opt_e", "opt_f"];
const LETTER_TO_INDEX: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
};

const fileError = (message: string): CsvParseResult => ({
  questions: [],
  totalRows: 0,
  invalidRows: 0,
  issues: [{ row: null, message, severity: "error" }],
});

/**
 * Parses either a CSV spreadsheet or Excel (.xlsx) file into structured DraftQuestions.
 */
export async function parseExamCsv(file: File): Promise<CsvParseResult> {
  if (file.size > MAX_BYTES) {
    return fileError("File exceeds maximum allowed size of 1 MB");
  }

  const isExcel =
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (isExcel) {
    try {
      const parsedData = (await readXlsxFile(file as any)) as any;
      let sheetRows: any[][] = [];

      if (Array.isArray(parsedData) && parsedData.length > 0) {
        // Multi-sheet format: [{ sheet: 'Questions', data: [[...], [...]] }, ...]
        if (parsedData[0] && typeof parsedData[0] === "object" && "data" in parsedData[0]) {
          const questionsSheet =
            parsedData.find(
              (s: any) =>
                String(s.sheet || "")
                  .trim()
                  .toLowerCase() === "questions"
            ) ||
            parsedData.find(
              (s: any) =>
                Array.isArray(s.data) &&
                s.data.length > 0 &&
                String(s.sheet || "")
                  .trim()
                  .toLowerCase() !== "instructions"
            ) ||
            parsedData[0];
          sheetRows = questionsSheet?.data || [];
        } else if (Array.isArray(parsedData[0])) {
          // Standard 2D array format: [[...], [...]]
          sheetRows = parsedData;
        }
      }

      if (!sheetRows || sheetRows.length === 0) {
        return fileError("The uploaded Excel file contains no data rows.");
      }

      const headerRow: string[] = (sheetRows[0] || []).map((c: any) =>
        String(c || "").trim().toLowerCase()
      );

      const records: Record<string, string>[] = [];
      for (let i = 1; i < sheetRows.length; i++) {
        const row = sheetRows[i];
        if (
          !row ||
          row.every(
            (c: any) => c === null || c === undefined || String(c).trim() === ""
          )
        ) {
          continue; // Skip blank rows
        }
        const record: Record<string, string> = {};
        headerRow.forEach((header: string, colIdx: number) => {
          if (header) {
            const val = row[colIdx];
            record[header] =
              val !== null && val !== undefined ? String(val).trim() : "";
          }
        });
        records.push(record);
      }

      return validateRows(records, headerRow);
    } catch (err: any) {
      return fileError(`Failed to parse Excel file: ${err.message || "Invalid spreadsheet format"}`);
    }
  }

  // Standard CSV parsing with PapaParse
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        resolve(validateRows(res.data, res.meta.fields ?? []));
      },
      error: (err) => resolve(fileError(err.message)),
    });
  });
}

export function validateRows(
  rows: Record<string, string>[],
  fields: string[]
): CsvParseResult {
  const missing = REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
  if (missing.length) {
    return fileError(
      `Missing required column(s): ${missing.join(", ")}. Download the template for the required format.`
    );
  }

  if (rows.length === 0) {
    return fileError("The uploaded file contains no question rows.");
  }

  if (rows.length > MAX_ROWS) {
    return fileError(`File contains too many rows (maximum ${MAX_ROWS} allowed).`);
  }

  const issues: CsvIssue[] = [];
  const questions: DraftQuestion[] = [];
  const seenOrders = new Set<number>();
  let invalidRows = 0;

  rows.forEach((raw, i) => {
    const rowNum = i + 2; // Line 1 is the header
    const rowIssues: CsvIssue[] = [];
    const err = (column: string, message: string) =>
      rowIssues.push({ row: rowNum, column, message, severity: "error" });
    const warn = (column: string, message: string) =>
      rowIssues.push({ row: rowNum, column, message, severity: "warning" });
    const cell = (k: string) => (raw[k] ?? "").trim();

    const typeRaw = cell("type").toLowerCase();
    const type = TYPE_ALIASES[typeRaw];
    if (!type) {
      err("type", `"${cell("type")}" is not a recognized question type.`);
    }

    const prompt = cell("prompt");
    if (!prompt) {
      err("prompt", "Question prompt is required.");
    }

    let order = i + 1;
    if (cell("order")) {
      const parsedOrder = Number(cell("order"));
      if (isNaN(parsedOrder) || parsedOrder < 1) {
        warn("order", "Order must be a positive number. Using sequence number.");
      } else if (seenOrders.has(parsedOrder)) {
        warn("order", `Duplicate order ${parsedOrder}. Question will be appended sequentially.`);
      } else {
        order = Math.floor(parsedOrder);
        seenOrders.add(order);
      }
    }

    let points = 1.0;
    if (cell("points")) {
      const parsedPoints = Number(cell("points"));
      if (isNaN(parsedPoints) || parsedPoints <= 0 || parsedPoints > 100) {
        warn("points", "Points must be between 0.01 and 100. Defaulting to 1.0.");
      } else {
        points = parsedPoints;
      }
    }

    const tags = cell("tags")
      ? cell("tags")
          .split(/[,|]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const context = cell("context") || undefined;
    const instructions = cell("instructions") || undefined;

    let options: string[] | null = null;
    let answers: string[] = [];
    let answerSource: "provided" | "ai_inferred" | "missing" = "provided";
    let confirmed = false;

    if (type === "multiple_choice") {
      const rawOpts = OPTION_KEYS.map((k) => cell(k)).filter(Boolean);
      if (rawOpts.length < 2) {
        err("opt_a", "Multiple choice questions require at least 2 options (opt_a and opt_b).");
      }
      options = rawOpts;

      const rawAnswer = cell("answer");
      if (!rawAnswer) {
        err("answer", "Multiple choice question requires an answer key.");
      } else {
        const letterKey = rawAnswer.toLowerCase().trim();
        if (letterKey in LETTER_TO_INDEX) {
          const idx = LETTER_TO_INDEX[letterKey];
          if (idx < rawOpts.length) {
            answers = [rawOpts[idx]];
            confirmed = true;
          } else {
            err("answer", `Answer letter '${rawAnswer.toUpperCase()}' refers to an option that does not exist.`);
          }
        } else if (/^opt_[a-f]$/i.test(letterKey)) {
          const letter = letterKey.replace("opt_", "");
          const idx = LETTER_TO_INDEX[letter];
          if (idx !== undefined && idx < rawOpts.length) {
            answers = [rawOpts[idx]];
            confirmed = true;
          } else {
            err("answer", `Answer '${rawAnswer}' refers to an option that does not exist.`);
          }
        } else if (/^[1-6]$/.test(letterKey)) {
          const idx = parseInt(letterKey, 10) - 1;
          if (idx < rawOpts.length) {
            answers = [rawOpts[idx]];
            confirmed = true;
          } else {
            err("answer", `Answer index ${letterKey} exceeds option count (${rawOpts.length}).`);
          }
        } else if (rawOpts.some((o) => o.toLowerCase().trim() === rawAnswer.toLowerCase().trim())) {
          const matched = rawOpts.find((o) => o.toLowerCase().trim() === rawAnswer.toLowerCase().trim())!;
          answers = [matched];
          confirmed = true;
        } else {
          err("answer", `Answer '${rawAnswer}' does not match any of the provided options.`);
        }
      }
    } else if (type === "true_false") {
      options = null;
      const rawAnswer = cell("answer").toLowerCase().trim();
      if (["true", "t", "1", "yes", "tama"].includes(rawAnswer)) {
        answers = ["true"];
        confirmed = true;
      } else if (["false", "f", "0", "no", "mali"].includes(rawAnswer)) {
        answers = ["false"];
        confirmed = true;
      } else {
        err("answer", "True/False answer must be 'true' or 'false'.");
      }
    } else if (type === "identification") {
      options = null;
      const rawAnswer = cell("answer");
      if (!rawAnswer) {
        err("answer", "Identification question requires at least one accepted answer.");
      } else {
        answers = rawAnswer
          .split(/[|;]/)
          .map((a) => a.trim())
          .filter(Boolean);
        if (answers.length === 0) {
          err("answer", "No valid accepted answers found after splitting.");
        } else {
          confirmed = true;
        }
      }
    } else if (type === "essay") {
      options = null;
      answers = [];
      answerSource = "missing";
      confirmed = true; // Essays do not require an answer key
    }

    if (rowIssues.some((issue) => issue.severity === "error")) {
      invalidRows++;
    }

    issues.push(...rowIssues);

    if (type) {
      questions.push({
        tempId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        order,
        type,
        prompt: prompt || "",
        promptJson: plainTextToTiptap(prompt || ""),
        options,
        answers,
        answerSource,
        points,
        tags,
        context,
        instructions,
        warnings: rowIssues
          .filter((i) => i.severity === "warning")
          .map((i) => i.message),
        confirmed,
      });
    }
  });

  return {
    questions,
    issues,
    totalRows: rows.length,
    invalidRows,
  };
}
