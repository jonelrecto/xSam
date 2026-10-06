import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { editorExtensions, plainTextToTiptap, tiptapToPlainText } from "@xsam/shared";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Table as TableIcon,
  Image as ImageIcon,
} from "lucide-react";

interface RichTextEditorProps {
  value?: any;
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
        class: `prose max-w-none text-sm focus:outline-none py-2 px-3 text-foreground dark:text-slate-100 dark:prose-invert min-h-[${minHeight}]`,
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const plain = tiptapToPlainText(json);
      onChange?.(json, plain);
    },
  });

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
        className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground animate-pulse"
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
    <div className="w-full rounded-xl border border-input bg-background overflow-hidden focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
      {!disabled && (
        <div className="flex flex-wrap items-center gap-1 p-1.5 bg-muted/60 border-b border-border text-muted-foreground">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
              editor.isActive("bold")
                ? "bg-primary/20 text-primary font-bold"
                : ""
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
              editor.isActive("italic")
                ? "bg-primary/20 text-primary"
                : ""
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
              editor.isActive("underline")
                ? "bg-primary/20 text-primary"
                : ""
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
              editor.isActive("bulletList")
                ? "bg-primary/20 text-primary"
                : ""
            }`}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
              editor.isActive("orderedList")
                ? "bg-primary/20 text-primary"
                : ""
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          {!editor.isActive("table") ? (
            <button
              type="button"
              onClick={insertTable}
              className="p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors text-xs flex items-center gap-1"
              title="Insert Table (3x3)"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Table</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-[10px]">
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="hover:text-foreground px-1"
                title="Add Row"
              >
                +Row
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="hover:text-foreground px-1"
                title="Add Column"
              >
                +Col
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="hover:text-destructive px-1 text-destructive"
                title="Delete Table"
              >
                Del
              </button>
            </div>
          )}

          <div className="w-px h-4 bg-border mx-1" />

          <button
            type="button"
            onClick={addImage}
            className="p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Insert Image URL"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div style={{ minHeight }} className="p-1">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
