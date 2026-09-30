import ExcelJS from "exceljs";
import path from "node:path";
import fs from "node:fs";

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "XSAM Platform";
  workbook.lastModifiedBy = "XSAM Build";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Sheet 1: Questions Template
  const sheet = workbook.addWorksheet("Questions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "type", key: "type", width: 18 },
    { header: "prompt", key: "prompt", width: 45 },
    { header: "opt_a", key: "opt_a", width: 22 },
    { header: "opt_b", key: "opt_b", width: 22 },
    { header: "opt_c", key: "opt_c", width: 22 },
    { header: "opt_d", key: "opt_d", width: 22 },
    { header: "opt_e", key: "opt_e", width: 22 },
    { header: "opt_f", key: "opt_f", width: 22 },
    { header: "answer", key: "answer", width: 24 },
    { header: "points", key: "points", width: 10 },
    { header: "tags", key: "tags", width: 20 },
    { header: "context", key: "context", width: 35 },
    { header: "instructions", key: "instructions", width: 30 },
  ];

  // Header styling
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" }, // Indigo
  };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 28;

  // Sample Rows
  sheet.addRow({
    type: "multiple_choice",
    prompt: "What is the primary function of mitochondria in eukaryotic cells?",
    opt_a: "Protein synthesis",
    opt_b: "Cellular respiration and ATP generation",
    opt_c: "Photosynthesis",
    opt_d: "Lipid storage",
    opt_e: "",
    opt_f: "",
    answer: "b",
    points: 1,
    tags: "Biology, Grade 10",
    context: "",
    instructions: "Choose the single best answer.",
  });

  sheet.addRow({
    type: "true_false",
    prompt: "HTTP is a stateful communication protocol.",
    opt_a: "",
    opt_b: "",
    opt_c: "",
    opt_d: "",
    opt_e: "",
    opt_f: "",
    answer: "false",
    points: 1,
    tags: "Networking, Computer Science",
    context: "",
    instructions: "",
  });

  sheet.addRow({
    type: "identification",
    prompt: "What is the capital city of the Philippines?",
    opt_a: "",
    opt_b: "",
    opt_c: "",
    opt_d: "",
    opt_e: "",
    opt_f: "",
    answer: "Manila|City of Manila",
    points: 2,
    tags: "Geography, Social Studies",
    context: "",
    instructions: "Type the exact name.",
  });

  sheet.addRow({
    type: "essay",
    prompt: "Explain the implications of quantum computing on modern cryptographic algorithms.",
    opt_a: "",
    opt_b: "",
    opt_c: "",
    opt_d: "",
    opt_e: "",
    opt_f: "",
    answer: "",
    points: 5,
    tags: "Cybersecurity, Advanced",
    context: "",
    instructions: "Provide a structured 3-paragraph explanation.",
  });

  // Add Data Validation dropdown on type column (rows 2 to 250)
  for (let r = 2; r <= 250; r++) {
    sheet.getCell(`A${r}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"multiple_choice,true_false,identification,essay"'],
      showErrorMessage: true,
      errorTitle: "Invalid Question Type",
      error: "Please select one of: multiple_choice, true_false, identification, essay",
    };
  }

  // Sheet 2: Instructions Sheet
  const instructionsSheet = workbook.addWorksheet("Instructions");
  instructionsSheet.columns = [
    { header: "Field", key: "field", width: 20 },
    { header: "Required", key: "required", width: 12 },
    { header: "Description & Allowed Values", key: "desc", width: 70 },
  ];

  instructionsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  instructionsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };
  instructionsSheet.getRow(1).height = 24;

  const guide = [
    {
      field: "type",
      required: "Yes",
      desc: "Must be: multiple_choice, true_false, identification, or essay.",
    },
    {
      field: "prompt",
      required: "Yes",
      desc: "The question statement or question prompt.",
    },
    {
      field: "opt_a - opt_f",
      required: "For MCQ",
      desc: "Options A through F. Multiple choice requires at least opt_a and opt_b.",
    },
    {
      field: "answer",
      required: "Except Essay",
      desc: "MCQ: letter (a, b, c...) or exact option text. T/F: true or false. Identification: pipe-separated variants (e.g. Manila|City of Manila). Essay: leave empty.",
    },
    {
      field: "points",
      required: "No",
      desc: "Point weight (positive number between 0.25 and 100). Default is 1.0.",
    },
    {
      field: "tags",
      required: "No",
      desc: "Comma-separated topics or grade levels (e.g. Algebra, Grade 10).",
    },
    {
      field: "context",
      required: "No",
      desc: "Shared reading passage or background context for passage-based questions.",
    },
    {
      field: "instructions",
      required: "No",
      desc: "Section-specific directions or rubric hints.",
    },
  ];

  guide.forEach((g) => instructionsSheet.addRow(g));

  const outputDir = path.join(process.cwd(), "public", "templates");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "exam_import_template.xlsx");
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Generated template at: ${outputPath}`);
}

generateTemplate().catch((err) => {
  console.error("Error generating template:", err);
  process.exit(1);
});
