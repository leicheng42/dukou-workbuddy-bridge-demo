import { ArrowUpRight, FileArchive, Images, MessageSquareText, Paperclip, X } from "lucide-react";
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
    .slice(0, compact ? 2 : 4)
    .map((message) => `${message.sender}：${message.body.replace(/\s+/g, " ").slice(0, 34)}`);
  const imageMedia = archive.media
    .filter((media) => media.mime.startsWith("image/"))
    .slice(0, compact ? 2 : 3);

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
            <span className="attachment-card__eyebrow">
              <span className="attachment-card__received-dot" />
              Dukou 已送达
            </span>
            <strong>转发内容</strong>
            <small>{archive.fileName}</small>
          </span>
          {!onRemove ? (
            <span className="attachment-card__open">
              展开
              <ArrowUpRight size={13} />
            </span>
          ) : null}
        </div>

        {imageMedia.length > 0 ? (
          <div
            className="attachment-card__media"
            data-count={Math.min(imageMedia.length, 3)}
          >
            {imageMedia.map((media) => (
              <span className="attachment-card__media-item" key={media.id}>
                <img src={media.url} alt={media.name} />
              </span>
            ))}
            {archive.media.length > imageMedia.length ? (
              <span className="attachment-card__media-more">
                <Images size={15} />
                +{archive.media.length - imageMedia.length}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="attachment-card__lines">
          {lines.map((line, index) => (
            <span key={`${line}-${index}`}>{line}</span>
          ))}
        </div>
        <div className="attachment-card__footer">
          <span>
            <MessageSquareText size={12} />
            {archive.messages.length} 条消息
          </span>
          {archive.media.length > 0 ? (
            <span>
              <Paperclip size={12} />
              {archive.media.length} 个附件
            </span>
          ) : null}
          <span className="attachment-card__size">{formatFileSize(archive.fileSize)}</span>
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
