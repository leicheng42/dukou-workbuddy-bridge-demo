import { FileArchive, Image as ImageIcon, X } from "lucide-react";
import { useEffect } from "react";
import { formatFileSize } from "../lib/wechatArchive";
import type { ChatArchive } from "../types";

interface ArchivePreviewProps {
  archive: ChatArchive;
  onClose: () => void;
}

export function ArchivePreview({ archive, onClose }: ArchivePreviewProps) {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="archive-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="archive-dialog__header">
          <div className="archive-dialog__traffic" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="archive-dialog__title">
            <FileArchive size={19} strokeWidth={1.8} />
            <div>
              <h2 id="archive-dialog-title">转发内容</h2>
              <p>
                {archive.fileName} · {formatFileSize(archive.fileSize)}
              </p>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭预览">
            <X size={18} />
          </button>
        </header>

        <div className="archive-dialog__summary">
          <span>{archive.messages.length} 条消息</span>
          <span>{archive.participants.join("、") || "未知参与者"}</span>
          <span>{archive.media.length} 个媒体</span>
        </div>

        <div className="archive-dialog__timeline">
          {archive.messages.map((message) => (
            <article className="archive-message" key={message.id}>
              <div className="archive-message__rail" aria-hidden="true">
                <span>{message.sender.slice(0, 1)}</span>
              </div>
              <div className="archive-message__content">
                <header>
                  <strong>{message.sender}</strong>
                  <time>{message.timestampLabel}</time>
                </header>
                <p>{message.body}</p>
                {message.media.length > 0 ? (
                  <div className="archive-message__media">
                    {message.media.map((media) =>
                      media.mime.startsWith("image/") ? (
                        <img key={media.id} src={media.url} alt={media.name} />
                      ) : (
                        <span key={media.id}>
                          <ImageIcon size={15} />
                          {media.name}
                        </span>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
