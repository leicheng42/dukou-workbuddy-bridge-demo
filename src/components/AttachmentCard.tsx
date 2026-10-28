import { FileArchive, X } from "lucide-react";
import { formatFileSize } from "../lib/wechatArchive";
import type { ChatArchive } from "../types";

interface AttachmentCardProps {
  archive: ChatArchive;
  compact?: boolean;
  onOpen: () => void;
  onRemove?: () => void;
}

export function AttachmentCard({
  archive,
  compact = false,
  onOpen,
  onRemove
}: AttachmentCardProps) {
  const lines = archive.messages
    .slice(0, compact ? 3 : 4)
    .map((message) => `${message.sender}：${message.body.replace(/\s+/g, " ").slice(0, 34)}`);

  return (
    <article className={compact ? "attachment-card is-compact" : "attachment-card"}>
      <button
        className="attachment-card__surface"
        type="button"
        onClick={onOpen}
        aria-label={`查看转发内容，共 ${archive.messages.length} 条消息`}
      >
        <div className="attachment-card__heading">
          <span className="attachment-card__icon">
            <FileArchive size={17} strokeWidth={1.8} />
          </span>
          <span>
            <strong>转发内容</strong>
            <small>{archive.fileName}</small>
          </span>
        </div>
        <div className="attachment-card__lines">
          {lines.map((line, index) => (
            <span key={`${line}-${index}`}>{line}</span>
          ))}
        </div>
        <div className="attachment-card__footer">
          <span>{archive.messages.length} 条消息</span>
          {archive.media.length > 0 ? <span>{archive.media.length} 个媒体</span> : null}
          <span>{formatFileSize(archive.fileSize)}</span>
        </div>
      </button>
      {onRemove ? (
        <button
          className="attachment-card__remove"
          type="button"
          onClick={onRemove}
          aria-label="移除转发内容"
        >
          <X size={14} strokeWidth={2.2} />
        </button>
      ) : null}
    </article>
  );
}
