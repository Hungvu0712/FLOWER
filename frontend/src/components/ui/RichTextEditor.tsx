'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

// Bộ nút CỐ TÌNH giới hạn khớp đúng allowlist thẻ HTML backend chấp nhận (xem
// backend/src/shared/utils/sanitizeHtml.ts) — tắt hẳn các extension StarterKit không nằm trong
// allowlist đó (code, codeBlock, strike, horizontalRule) thay vì để người dùng định dạng xong rồi bị
// âm thầm xoá mất lúc lưu, gây khó hiểu.
function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors ${
        active ? 'bg-rose text-white' : 'text-ink-soft hover:bg-ivory-50'
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    // Next.js App Router render ở server trước — tắt render ngay lúc mount để tránh lệch nội dung
    // giữa server/client (hydration mismatch), theo đúng khuyến nghị của TipTap cho Next.js.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose-sm max-w-none min-h-[120px] px-3 py-2 text-sm text-ink outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-rose [&_blockquote]:pl-3 [&_blockquote]:text-ink-muted',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Đồng bộ khi `value` bị đổi TỪ BÊN NGOÀI (vd reset form rỗng sau khi tạo xong) — không đồng bộ
  // ngược mỗi lần gõ phím (đó là việc của onUpdate ở trên), tránh mất vị trí con trỏ đang gõ.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="h-[156px] w-full rounded-xl border border-border bg-ivory-50" />;
  }

  const isEmpty = editor.isEmpty;

  return (
    <div className="overflow-hidden rounded-xl border border-border focus-within:border-rose focus-within:ring-1 focus-within:ring-rose">
      <div className="flex flex-wrap items-center gap-1 border-b border-border-soft bg-ivory-50 px-2 py-1.5">
        <ToolbarButton
          label="In đậm"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          label="In nghiêng"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label="Tiêu đề vừa"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Tiêu đề nhỏ"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label="Danh sách gạch đầu dòng"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •≡
        </ToolbarButton>
        <ToolbarButton
          label="Danh sách đánh số"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1≡
        </ToolbarButton>
        <ToolbarButton
          label="Trích dẫn"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          &ldquo;
        </ToolbarButton>
      </div>
      <div className="relative bg-white">
        {isEmpty && placeholder && (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-ink-muted">{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
