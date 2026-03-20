'use client';

import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, ImageIcon,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const items = [
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
    { type: 'separator' as const },
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
    { type: 'separator' as const },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
    { type: 'separator' as const },
    { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), active: false },
    {
      icon: ImageIcon,
      action: () => {
        const url = window.prompt('이미지 URL을 입력하세요');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      },
      active: false,
    },
  ];

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b border-border px-2 py-1.5">
      {items.map((item, i) => {
        if ('type' in item && item.type === 'separator') {
          return <div key={i} className="w-px h-5 bg-border mx-1" />;
        }
        const Icon = item.icon!;
        return (
          <Button
            key={i}
            variant="ghost"
            size="sm"
            onClick={item.action}
            className={`h-7 w-7 p-0 ${item.active ? 'bg-accent text-accent-foreground' : ''}`}
          >
            <Icon size={15} />
          </Button>
        );
      })}
    </div>
  );
}
