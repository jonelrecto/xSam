"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { editorExtensions } from "@/lib/editor/tiptap-config";
import { plainTextToTiptap, tiptapToPlainText } from "@/lib/editor/converters";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Table as TableIcon,
  Plus,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value?: any; // JSON doc or string
  placeholder?: string;
  minHeight?: string;
  onChange?: (docJson: any, plainText: string) => void;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  placeholder = "Write content here...",
  minHeight = "80px",
  onChange,
  disabled = false,
}: RichTextEditorProps) {
  const initialContent = React.useMemo(() => {
    if (!value) return plainTextToTiptap("");
    if (typeof value === "string") return plainTextToTiptap(value);
    return value;
  }, [value]);

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialContent,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none text-sm focus:outline-none py-2 px-3 text-slate-100 min-h-[${minHeight}]`,
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const plain = tiptapToPlainText(json);
      onChange?.(json, plain);
    },
  });

  // Keep content in sync if value changed externally
  useEffect(() => {
    if (!editor || !value) return;
    const currentJson = JSON.stringify(editor.getJSON());
    const incomingJson = JSON.stringify(
      typeof value === "string" ? plainTextToTiptap(value) : value
    );
    if (currentJson !== incomingJson) {
      editor.commands.setContent(
        typeof value === "string" ? plainTextToTiptap(value) : value
      );
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-500 animate-pulse"
        style={{ minHeight }}
      >
        Loading rich editor...
      </div>
    );
  }

  const addImage = () => {
    const url = window.prompt("Enter image URL (HTTPS):");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  return (
    <div className="w-full rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
      {/* Editor Toolbar */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-900/90 border-b border-slate-800/80 text-slate-400">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors ${
              editor.isActive("bold")
                ? "bg-indigo-600/30 text-indigo-400 font-bold"
                : ""
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors ${
              editor.isActive("italic")
                ? "bg-indigo-600/30 text-indigo-400"
                : ""
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors ${
              editor.isActive("underline")
                ? "bg-indigo-600/30 text-indigo-400"
                : ""
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors ${
              editor.isActive("bulletList")
                ? "bg-indigo-600/30 text-indigo-400"
                : ""
            }`}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors ${
              editor.isActive("orderedList")
                ? "bg-indigo-600/30 text-indigo-400"
                : ""
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Table Tools */}
          {!editor.isActive("table") ? (
            <button
              type="button"
              onClick={insertTable}
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors text-xs flex items-center gap-1"
              title="Insert Table (3x3)"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Table</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="hover:text-white px-1"
                title="Add Row"
              >
                +Row
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="hover:text-white px-1"
                title="Add Column"
              >
                +Col
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="hover:text-red-400 px-1 text-red-400"
                title="Delete Table"
              >
                Del
              </button>
            </div>
          )}

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Image */}
          <button
            type="button"
            onClick={addImage}
            className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
            title="Insert Image URL"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor Prose Area */}
      <div style={{ minHeight }} className="p-1">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
