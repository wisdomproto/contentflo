'use client';

import { useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './editor-toolbar';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { countWords } from '@/lib/utils';

export interface BaseArticleEditorRef {
  setContent: (html: string) => void;
  getHTML: () => string;
  getPlainText: () => string;
  replaceSelection: (html: string) => void;
}

interface BaseArticleEditorProps {
  initialContent?: string;
  onUpdate?: (html: string, plainText: string, wordCount: number) => void;
  onPartialRegenerate?: (selectedText: string) => void;
}

export const BaseArticleEditor = forwardRef<BaseArticleEditorRef, BaseArticleEditorProps>(
  function BaseArticleEditor({ initialContent, onUpdate, onPartialRegenerate }, ref) {
    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Image,
        Placeholder.configure({ placeholder: 'AI로 글을 생성하거나 직접 작성해 보세요...' }),
      ],
      content: initialContent || '',
      editorProps: {
        attributes: {
          class: 'tiptap prose-sm px-4 py-3 focus:outline-none',
        },
      },
      onUpdate: ({ editor: e }) => {
        if (onUpdate) {
          const html = e.getHTML();
          const text = e.getText();
          onUpdate(html, text, countWords(text));
        }
      },
    });

    useEffect(() => {
      if (editor && initialContent !== undefined && editor.getHTML() !== initialContent) {
        editor.commands.setContent(initialContent, { emitUpdate: false });
      }
    }, [initialContent]); // eslint-disable-line react-hooks/exhaustive-deps

    const getSelectedText = useCallback(() => {
      if (!editor) return '';
      const { from, to } = editor.state.selection;
      return editor.state.doc.textBetween(from, to, ' ');
    }, [editor]);

    useImperativeHandle(ref, () => ({
      setContent: (html: string) => {
        editor?.commands.setContent(html, { emitUpdate: false });
      },
      getHTML: () => editor?.getHTML() ?? '',
      getPlainText: () => editor?.getText() ?? '',
      replaceSelection: (html: string) => {
        if (!editor) return;
        editor.chain().focus().deleteSelection().insertContent(html).run();
      },
    }));

    return (
      <div className="flex flex-col border border-border rounded-lg overflow-hidden bg-background">
        <EditorToolbar editor={editor} />
        <div className="min-h-[400px]">
          <EditorContent editor={editor} />
        </div>
        {editor && (
          <BubbleMenu editor={editor}>
            <div className="flex items-center gap-1 bg-popover border border-border rounded-lg shadow-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const text = getSelectedText();
                  if (text && onPartialRegenerate) onPartialRegenerate(text);
                }}
              >
                <Sparkles size={12} /> 이 부분 다시 쓰기
              </Button>
            </div>
          </BubbleMenu>
        )}
      </div>
    );
  }
);
