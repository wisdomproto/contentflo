'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjectStore } from '@/stores/project-store';

interface CreateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateContentDialog({ open, onOpenChange, projectId }: CreateContentDialogProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const createContent = useProjectStore((s) => s.createContent);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    createContent({
      project_id: projectId,
      title: title.trim(),
      category: category.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    setTitle('');
    setCategory('');
    setTagsInput('');
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 컨텐츠</DialogTitle>
          <DialogDescription>
            컨텐츠를 생성하면 기본 글과 채널별 컨텐츠를 작성할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content-title">컨텐츠 제목 *</Label>
            <Input
              id="content-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="예: 장 건강을 위한 프로바이오틱스 가이드"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-category">카테고리</Label>
            <Input
              id="content-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: 건강, IT, 뷰티"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-tags">태그</Label>
            <Input
              id="content-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="쉼표로 구분 (예: 건강, 프로바이오틱스, 장건강)"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            취소
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
