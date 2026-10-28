import {
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardPaste,
  FileArchive,
  FileText,
  Github,
  Image as ImageIcon,
  Layers3,
  ListTodo,
  LoaderCircle,
  MoreHorizontal,
  PanelRightOpen,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent
} from "react";
import { AttachmentCard } from "./components/AttachmentCard";
import { ArchivePreview } from "./components/ArchivePreview";
import { Sidebar } from "./components/Sidebar";
import { DEMO_ARCHIVE } from "./data/demoArchive";
import {
  filesFromTransfer,
  formatFileSize,
  parseArchiveFile,
  revokeArchiveURLs,
  summarizeArchive
} from "./lib/wechatArchive";
import type { ChatArchive, ChatSummary } from "./types";

interface SubmittedTurn {
  archive: ChatArchive;
  prompt: string;
  summary: ChatSummary;
}

interface ToastState {
  message: string;
  tone: "success" | "error";
}

const DEFAULT_PROMPT = "请通读，按时间线总结要点、结论和待办。";
const SUPPORTED_FILE = /\.(zip|txt|html?|json)$/i;

export default function App() {
  const [attachment, setAttachment] = useState<ChatArchive | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedTurn | null>(null);
  const [draft, setDraft] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<ChatArchive | null>(null);
  const submittedRef = useRef<SubmittedTurn | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string, tone: ToastState["tone"] = "success") => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const focusComposer = useCallback(() => {
    window.requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
  }, []);

  const replaceAttachment = useCallback((next: ChatArchive) => {
    revokeArchiveURLs(attachmentRef.current);
    attachmentRef.current = next;
    setAttachment(next);
    setDraft(DEFAULT_PROMPT);
    setSubmitted(null);
    submittedRef.current = null;
    window.setTimeout(
      () => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }),
      30
    );
    focusComposer();
  }, [focusComposer]);

  const receiveFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isParsing) return;
      const supported = files
        .filter((file) => SUPPORTED_FILE.test(file.name))
        .sort((left, right) => {
          const score = (file: File) =>
            file.name.toLowerCase().endsWith(".zip")
              ? 3
              : file.name.toLowerCase().endsWith(".json")
                ? 2
                : 1;
          return score(right) - score(left);
        });
      const file = supported[0];
      if (!file) {
        showToast("没有找到可读取的 ZIP、TXT、HTML 或 JSON 聊天记录。", "error");
        return;
      }
      setIsParsing(true);
      try {
        const archive = await parseArchiveFile(file);
        replaceAttachment(archive);
        const ignored = files.length - 1;
        showToast(
          `已从 Dukou 接收 ${archive.messages.length} 条消息${ignored > 0 ? `，另忽略 ${ignored} 个文件` : ""}。`
        );
      } catch (error) {
        showToast(error instanceof Error ? error.message : "聊天记录解析失败。", "error");
      } finally {
        setIsParsing(false);
      }
    },
    [isParsing, replaceAttachment, showToast]
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = filesFromTransfer(event.clipboardData);
      if (files.length === 0) return;
      event.preventDefault();
      void receiveFiles(files);
    };
    const focus = () => focusComposer();
    window.addEventListener("paste", onPaste);
    window.addEventListener("focus", focus);
    const frame = window.requestAnimationFrame(focusComposer);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("focus", focus);
      window.cancelAnimationFrame(frame);
    };
  }, [focusComposer, receiveFiles]);

  useEffect(() => {
    const preventFileNavigation = (event: globalThis.DragEvent) => {
      if (Array.from(event.dataTransfer?.types ?? []).includes("Files")) {
        event.preventDefault();
      }
    };
    window.addEventListener("dragover", preventFileNavigation);
    window.addEventListener("drop", preventFileNavigation);
    return () => {
      window.removeEventListener("dragover", preventFileNavigation);
      window.removeEventListener("drop", preventFileNavigation);
    };
  }, []);

  useEffect(
    () => () => {
      revokeArchiveURLs(attachmentRef.current);
      if (submittedRef.current?.archive !== attachmentRef.current) {
        revokeArchiveURLs(submittedRef.current?.archive ?? null);
      }
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    []
  );

  const loadDemo = () => {
    replaceAttachment(DEMO_ARCHIVE);
    showToast("已载入演示聊天记录：" + DEMO_ARCHIVE.messages.length + " 条消息。");
  };

  const removeAttachment = () => {
    revokeArchiveURLs(attachmentRef.current);
    attachmentRef.current = null;
    setAttachment(null);
    setDraft("");
    focusComposer();
  };

  const submit = () => {
    if (!attachment) return;
    const prompt = draft.trim() || DEFAULT_PROMPT;
    const summary = summarizeArchive(attachment);
    const turn = { archive: attachment, prompt, summary };
    revokeArchiveURLs(submittedRef.current?.archive ?? null);
    submittedRef.current = turn;
    setSubmitted(turn);
    attachmentRef.current = null;
    setAttachment(null);
    setDraft("");
    window.setTimeout(
      () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      40
    );
  };

  const reset = () => {
    revokeArchiveURLs(attachmentRef.current);
    revokeArchiveURLs(submittedRef.current?.archive ?? null);
    attachmentRef.current = null;
    submittedRef.current = null;
    setAttachment(null);
    setSubmitted(null);
    setDraft("");
    setPreviewOpen(false);
    focusComposer();
  };

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    void receiveFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void receiveFiles(Array.from(event.dataTransfer.files));
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && (attachment || draft.trim())) {
      event.preventDefault();
      submit();
    }
  };

  const activePreview = submitted?.archive ?? attachment;
  const receivedArchive = attachment ?? submitted?.archive ?? null;
  const hasReceived = receivedArchive !== null;

  return (
    <div
      className={isDragging ? "app-shell is-dragging" : "app-shell"}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-testid="app-shell"
    >
      <Sidebar onDemo={loadDemo} />

      <section className="workspace">
        <header className="topbar">
          <div className="topbar__breadcrumb">
            <span className="topbar__status-dot" />
            <strong>总结聊天记录要点和待办</strong>
            <span className="topbar__saved">
              <Check size={12} />
              本地草稿
            </span>
          </div>
          <div className="topbar__actions">
            <button className="icon-button" type="button" aria-label="搜索">
              <Search size={17} />
            </button>
            <button className="icon-button" type="button" aria-label="更多选项">
              <MoreHorizontal size={18} />
            </button>
            <a
              className="github-link"
              href="https://github.com/leicheng42/dukou-workbuddy-bridge-demo"
              target="_blank"
              rel="noreferrer"
              aria-label="打开 GitHub 仓库"
            >
              <Github size={17} />
            </a>
          </div>
        </header>

        <div className="workspace-grid">
          <main className="conversation">
            <div className="conversation__scroll" ref={scrollRef}>
              <div className="conversation__inner">
                <div className="day-divider">
                  <span>今天</span>
                </div>

                <article className="assistant-entry">
                  <div className="assistant-avatar" aria-hidden="true">
                    <span>R</span>
                  </div>
                  <div className="assistant-content">
                    <div className="assistant-meta">
                      <strong>Relay Chat</strong>
                      <span>{submitted ? "本轮记录已解析" : "Dukou 接收端"}</span>
                      {submitted ? (
                        <span className="status-pill">
                          <CheckCircle2 size={12} />
                          就绪
                        </span>
                      ) : (
                        <span className="status-pill is-live">
                          <span />
                          等待转发
                        </span>
                      )}
                    </div>
                    <section className="welcome-card">
                      <div className="welcome-card__eyebrow">
                        <Sparkles size={14} />
                        DUKOU → CHAT RECEIVER
                      </div>
                      <h1>
                        {submitted
                          ? "记录已经落地，下面是这次对话的拆解。"
                          : "把微信聊天记录，直接接进一段对话。"}
                      </h1>
                      <p>
                        {submitted
                          ? "你可以在下方查看原始转发卡片；摘要保留了参与者、时间范围、关键结论和可执行事项。"
                          : "在 Dukou 中把聊天记录转发到当前页面。文件会在这里被本地解压、预览，并生成一份可核对的要点与待办摘要。"}
                      </p>
                      {!submitted ? (
                        <div className="welcome-actions">
                          <button className="primary-action" type="button" onClick={loadDemo}>
                            <WandSparkles size={16} />
                            模拟 Dukou 转发
                          </button>
                          <button
                            className="secondary-action"
                            type="button"
                            onClick={() => inputRef.current?.click()}
                          >
                            <Paperclip size={16} />
                            选择记录文件
                          </button>
                        </div>
                      ) : null}
                    </section>
                  </div>
                </article>

                {submitted ? (
                  <>
                    <article className="user-entry">
                      <div className="user-bubble">
                        <p>{submitted.prompt}</p>
                        <AttachmentCard
                          archive={submitted.archive}
                          compact
                          onOpen={() => setPreviewOpen(true)}
                        />
                      </div>
                      <div className="user-avatar" aria-hidden="true">
                        磊
                      </div>
                    </article>
                    <article className="assistant-entry is-followup">
                      <div className="assistant-avatar" aria-hidden="true">
                        <span>R</span>
                      </div>
                      <div className="assistant-content">
                        <div className="assistant-meta">
                          <strong>Relay Chat</strong>
                          <span>刚刚完成</span>
                        </div>
                        <SummaryView
                          summary={submitted.summary}
                          archive={submitted.archive}
                        />
                      </div>
                    </article>
                  </>
                ) : null}
              </div>
            </div>

            <div className="composer-dock">
              <div className={attachment ? "composer has-attachment" : "composer"}>
                {attachment ? (
                  <AttachmentCard
                    archive={attachment}
                    compact
                    onOpen={() => setPreviewOpen(true)}
                    onRemove={removeAttachment}
                  />
                ) : null}
                <div className="composer__input-row">
                  <button
                    className="composer__plus"
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    aria-label="选择聊天记录文件"
                  >
                    <Plus size={19} />
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onComposerKeyDown}
                    placeholder="今天帮你做些什么？按 ⌘V 接收 Dukou 转发内容"
                    rows={1}
                    aria-label="消息"
                    data-testid="composer"
                  />
                  <button
                    className="composer__send"
                    type="button"
                    onClick={submit}
                    disabled={!attachment}
                    aria-label="发送"
                    data-testid="send"
                  >
                    <ArrowUp size={19} />
                  </button>
                </div>
                <div className="composer__meta">
                  <span>
                    <ShieldCheck size={14} />
                    文件仅在浏览器本地解析
                  </span>
                  <button type="button">
                    <span className="model-dot" />
                    本地规则预演
                    <ChevronDown size={13} />
                  </button>
                </div>
              </div>
              <p className="composer-note">
                支持微信聊天记录 ZIP、TXT、HTML、JSON · 不读取、不上传、不持久化
              </p>
            </div>
          </main>

          <aside className="signal-rail">
            <section className="rail-card rail-card--status">
              <div className="rail-card__eyebrow">
                <span className="live-pulse" />
                BRIDGE STATUS
              </div>
              <h2>{hasReceived ? "转发内容已解析" : "等待 Dukou 送达"}</h2>
              <p>
                {receivedArchive
                  ? `${formatFileSize(receivedArchive.fileSize)} · ${receivedArchive.messages.length} 条消息`
                  : "保持此页面打开，按 ⌘V 或拖入聊天记录即可。"}
              </p>
              <div className="status-strip">
                <span className="is-done">
                  <Check size={12} />
                  激活页面
                </span>
                <ArrowRight size={13} />
                <span className={hasReceived ? "is-done" : ""}>
                  {isParsing ? <LoaderCircle className="spin" size={12} /> : <FileArchive size={12} />}
                  接收文件
                </span>
                <ArrowRight size={13} />
                <span className={hasReceived ? "is-done" : ""}>
                  <Layers3 size={12} />
                  生成上下文
                </span>
              </div>
            </section>

            <section className="rail-card">
              <div className="rail-card__heading">
                <div>
                  <span className="rail-card__kicker">PIPELINE</span>
                  <h3>一条记录如何抵达</h3>
                </div>
                <PanelRightOpen size={17} />
              </div>
              <ol className="pipeline">
                <li>
                  <span>01</span>
                  <div>
                    <strong>Dukou 激活窗口</strong>
                    <p>发送系统文件 URL，并用 ⌘V 投递。</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>页面全局接收</strong>
                    <p>输入框自动聚焦，窗口级 paste 兜底。</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>本地解包</strong>
                    <p>识别转录文本、图片和附件清单。</p>
                  </div>
                </li>
                <li>
                  <span>04</span>
                  <div>
                    <strong>对话化呈现</strong>
                    <p>生成转发卡片、时间线与待办预演。</p>
                  </div>
                </li>
              </ol>
            </section>

            <section className="rail-card rail-card--privacy">
              <div className="privacy-seal">
                <ShieldCheck size={19} />
              </div>
              <div>
                <span className="rail-card__kicker">LOCAL ONLY</span>
                <h3>聊天记录不离开浏览器</h3>
                <p>解压、预览和摘要全部在本机完成，没有 API 上传。</p>
              </div>
            </section>

            <button className="reset-button" type="button" onClick={reset}>
              <RotateCcw size={14} />
              重置演示
            </button>
          </aside>
        </div>
      </section>

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".zip,.txt,.html,.htm,.json,application/zip,text/plain,text/html,application/json"
        onChange={onFileInput}
        data-testid="file-input"
      />

      {isDragging ? (
        <div className="drop-overlay" aria-hidden="true">
          <div>
            <ClipboardPaste size={28} />
            <strong>松手，让聊天记录落地</strong>
            <span>ZIP、TXT、HTML 或 JSON</span>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`toast is-${toast.tone}`} role="status">
          {toast.tone === "success" ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
          <span>{toast.message}</span>
        </div>
      ) : null}

      {previewOpen && activePreview ? (
        <ArchivePreview
          archive={activePreview}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SummaryView({
  summary,
  archive
}: {
  summary: ChatSummary;
  archive: ChatArchive;
}) {
  return (
    <section className="summary-card" data-testid="summary">
      <div className="summary-card__topline">
        <span className="summary-badge">
          <FileText size={14} />
          已读取 {archive.messages.length} 条
        </span>
        <span className="summary-badge is-muted">
          <ImageIcon size={14} />
          {archive.media.length} 个媒体
        </span>
      </div>
      <h2>{summary.headline}</h2>
      <p className="summary-overview">{summary.overview}</p>
      <div className="summary-range">{summary.range}</div>

      <div className="summary-section">
        <h3>
          <Sparkles size={15} />
          关键结论
        </h3>
        <div className="highlight-list">
          {summary.highlights.map((highlight, index) => (
            <div className="highlight-row" key={`${highlight}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{highlight}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="summary-section">
        <h3>
          <ListTodo size={15} />
          可能待办
        </h3>
        {summary.actions.length > 0 ? (
          <div className="action-list">
            {summary.actions.map((action) => (
              <div className="action-row" key={action.id}>
                <span className="action-check">
                  <Check size={13} />
                </span>
                <p>{action.text}</p>
                <span className="action-source">
                  {action.due ? <strong>{action.due}</strong> : null}
                  {action.source}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-actions">没有识别到明确的责任、时间或行动指令。</p>
        )}
      </div>
      <footer className="summary-footer">
        <span>本地规则预演，不代替真实模型结论</span>
        <span>已覆盖 {archive.participants.join(" · ")}</span>
      </footer>
    </section>
  );
}
