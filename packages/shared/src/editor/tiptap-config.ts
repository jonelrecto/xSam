import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";

/**
 * Standard Tiptap extension suite for XSAM rich-text fields.
 * Restricted to: Paragraph, Bold, Italic, Underline, Lists, Table, Image.
 */
export const editorExtensions = [
  StarterKit.configure({
    heading: false,
    codeBlock: false,
    code: false,
    blockquote: false,
    horizontalRule: false,
  }),
  Table.configure({
    resizable: false,
  }),
  TableRow,
  TableHeader,
  TableCell,
  Image.configure({
    inline: true,
    allowBase64: true,
  }),
];

/**
 * Allowed node and mark names for server-side validation.
 */
export const ALLOWED_NODES = new Set([
  "doc",
  "paragraph",
  "text",
  "bulletList",
  "orderedList",
  "listItem",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "image",
]);

export const ALLOWED_MARKS = new Set([
  "bold",
  "italic",
  "underline",
]);
