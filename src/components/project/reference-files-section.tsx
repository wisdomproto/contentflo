'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, FileImage, File, Trash2 } from 'lucide-react';
import { generateId } from '@/lib/utils';
import type { Project, ReferenceFile } from '@/types/database';

interface ReferenceFilesSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return FileImage;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
  return File;
}

export function ReferenceFilesSection({ project, onUpdate }: ReferenceFilesSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const files: ReferenceFile[] = project.reference_files ?? [];

  const addFiles = useCallback(async (fileList: FileList) => {
    const newFiles: ReferenceFile[] = [];

    for (const f of Array.from(fileList)) {
      const id = generateId('ref');
      // 텍스트 파일이면 내용 추출 (AI 프롬프트 참고용)
      let extractedText: string | null = null;
      const textTypes = ['text/plain', 'text/markdown', 'text/html', 'application/json'];
      const textExts = ['.txt', '.md', '.markdown', '.json', '.csv'];
      const isTextFile = textTypes.includes(f.type) || textExts.some(ext => f.name.toLowerCase().endsWith(ext));
      if (isTextFile && f.size < 500_000) { // 500KB 이하만
        try {
          extractedText = await f.text();
          // 너무 길면 앞부분만 (토큰 절약)
          if (extractedText.length > 10_000) {
            extractedText = extractedText.slice(0, 10_000) + '\n...(이하 생략)';
          }
        } catch { /* ignore */ }
      }

      const fileEntry: ReferenceFile = {
        id,
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        added_at: new Date().toISOString(),
        url: null,
        r2_key: null,
        extracted_text: extractedText,
      };

      // Upload to R2
      try {
        const presignRes = await fetch('/api/storage/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            category: 'references',
            fileName: f.name,
            contentType: f.type || 'application/octet-stream',
            contentId: id,
          }),
        });

        if (presignRes.ok) {
          const { presignedUrl, publicUrl, key } = await presignRes.json();
          const uploadRes = await fetch(presignedUrl, {
            method: 'PUT',
            body: f,
            headers: { 'Content-Type': f.type || 'application/octet-stream' },
          });
          if (uploadRes.ok) {
            fileEntry.url = publicUrl;
            fileEntry.r2_key = key;
          }
        }
      } catch {
        // Upload failed — file metadata saved without URL
      }

      newFiles.push(fileEntry);
    }

    onUpdate({ reference_files: [...files, ...newFiles] });
  }, [files, onUpdate, project.id]);

  const removeFile = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file?.r2_key) {
      try {
        await fetch('/api/storage/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: [file.r2_key] }),
        });
      } catch {
        // Deletion failure is non-blocking
      }
    }
    const updated = files.filter((f) => f.id !== fileId);
    onUpdate({ reference_files: updated.length > 0 ? updated : null });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        프로젝트 참고 자료를 등록하면 이 프로젝트의 모든 컨텐츠에 기본으로 포함됩니다.
        각 컨텐츠 설정에서 개별 참고 자료를 추가할 수도 있습니다.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>참고 자료 파일</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <Upload size={28} className={`mx-auto mb-2 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium">
              {isDragOver ? '여기에 놓으세요' : '파일을 드래그하거나 클릭하여 선택'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, MD, TXT, HWP, 이미지 등 (다중 파일 가능)</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.docx,.doc,.md,.txt,.hwp,.png,.jpg,.jpeg,.gif,.webp"
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{files.length}개 파일</p>
              <div className="divide-y divide-border rounded-lg border">
                {files.map((file) => {
                  const Icon = getFileIcon(file.type);
                  return (
                    <div key={file.id} className="flex items-center gap-3 px-3 py-2.5">
                      <Icon size={18} className="shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {files.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">등록된 참고 자료가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
