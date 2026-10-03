"use client";

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Heading1, Heading2, Eye, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write markdown here...",
  className,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  const insertSyntax = (before: string, after: string = '') => {
    onChange(`${value}${before}${after}`);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <div className="flex items-center justify-between border-b px-2 py-1 bg-muted/40">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => insertSyntax('**', '**')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => insertSyntax('*', '*')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => insertSyntax('# ')}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => insertSyntax('## ')}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => insertSyntax('\n- ')}
            title="Bullet list"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => insertSyntax('\n1. ')}
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => insertSyntax('[Link Text](', ')')}
            title="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="write" className="text-xs px-2.5">
              <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs px-2.5">
              <Eye className="h-3.5 w-3.5 mr-1" /> Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === 'write' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border-0 rounded-none focus-visible:ring-0 min-h-[180px] font-mono text-sm resize-y"
        />
      ) : (
        <div className="p-4 min-h-[180px] max-h-80 overflow-y-auto prose dark:prose-invert prose-sm">
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic text-xs">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
