"use client";

import { useState } from "react";
import { SendHorizontal, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";

export function ChatComposer({
  disabled,
  streaming,
  onSend,
  onStop,
}: {
  disabled?: boolean;
  streaming?: boolean;
  onSend: (content: string) => void | Promise<void>;
  onStop?: () => void;
}) {
  const [value, setValue] = useState("");

  async function submit() {
    const content = value.trim();
    if (!content || disabled || streaming) return;
    setValue("");
    await onSend(content);
  }

  return (
    <div className="border-t border-border/70 bg-background/80 p-4 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0c0d14]/80">
      <div className="mx-auto max-w-3xl space-y-2">
        <div className="flex items-end gap-2 rounded-2xl border border-border/80 bg-card p-2 shadow-sm transition-all focus-within:border-foreground/20 focus-within:ring-1 focus-within:ring-foreground/10 dark:border-white/[0.10] dark:bg-[#12141e]/90 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.05)] dark:focus-within:border-white/20">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask about architecture, files, flows…"
            disabled={disabled}
            className="min-h-12 flex-1 border-0 bg-transparent px-3 py-2 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          {streaming ? (
            <Button
              size="icon-lg"
              variant="secondary"
              onClick={onStop}
              aria-label="Stop generating"
              className="dark:border-white/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.14]"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon-lg"
              disabled={disabled || !value.trim()}
              onClick={() => void submit()}
              aria-label="Send message"
              className="shadow-sm transition-all dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
            >
              {disabled ? <Spinner /> : <SendHorizontal />}
            </Button>
          )}
        </div>
        <p className="px-1 text-xs text-muted-foreground/80">
          Press <Kbd>Enter</Kbd> to send · <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd>{" "}
          for a new line
        </p>
      </div>
    </div>
  );
}
