import { strFromU8, unzipSync } from "fflate";
import type {
  ActionItem,
  ArchiveMedia,
  ArchiveMessage,
  ChatArchive,
  ChatSummary
} from "../types";

const MAX_ARCHIVE_BYTES = 40 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 120 * 1024 * 1024;
const MAX_MEDIA_PREVIEWS = 24;

const TIMESTAMP =
  /(?:(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\s+(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?)/;
const TASK_WORDS =
  /(记得|别忘|必须|需要|请|发给我|发到|发给|截止|之前|明天|今天|后天|本周|下周|周[一二三四五六日天]|完成|安排|确认|提醒)/;
const DUE_WORDS =
  /(今天|明天|后天|本周|下周|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}月\d{1,2}日|\d{1,2}[:：]\d{2})/;
const CONCLUSION_WORDS =
  /(确定|决定|结论|就按|可以|没问题|同意|好的|最终|调整为|改成|保留)/;

function makeID(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function normalizeSender(value: string): string {
  return value
    .replace(/^\[|\]$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[：:]\s*$/, "")
    .trim();
}

function parseDate(value: string): Date | null {
  const match = value.match(
    /((?:19|20)\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\s+([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/
  );
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0"] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

export function formatArchiveTime(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(value);
}

function cleanText(value: string): string {
  return value
    .replace(/\uFEFF/g, "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function htmlToText(value: string): string {
  return cleanText(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|tr|section|article|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#(\d+);/g, (_, number: string) => String.fromCodePoint(Number(number)))
  );
}

function appearsToBeHTML(value: string): boolean {
  return /<(?:html|body|div|p|br|table|span)\b/i.test(value);
}

function isLikelyHeader(lines: string[], index: number): boolean {
  if (index >= lines.length) return false;
  if (TIMESTAMP.test(lines[index])) return true;
  if (
    /^[^:：]{1,28}[:：]\s*.+$/.test(lines[index]) &&
    lines[index].length < 160 &&
    !/[。！？!?]$/.test(lines[index])
  ) {
    return true;
  }
  return (
    index + 1 < lines.length &&
    TIMESTAMP.test(lines[index + 1]) &&
    lines[index].length <= 40 &&
    !/[。！？!?]/.test(lines[index])
  );
}

function createMessage(
  rawSender: string,
  timestampLabel: string,
  bodyLines: string[],
  index: number,
  timestamp: Date | null
): ArchiveMessage {
  const timestampValue = timestamp ?? parseDate(timestampLabel);
  return {
    id: makeID("message", index),
    sender: normalizeSender(rawSender) || "聊天记录",
    timestamp: timestampValue,
    timestampLabel: timestampValue ? formatArchiveTime(timestampValue) : timestampLabel || "时间未知",
    body: cleanText(bodyLines.join("\n")) || "（无文本内容）",
    media: []
  };
}

export function parseTranscript(rawValue: string): ArchiveMessage[] {
  const source = appearsToBeHTML(rawValue) ? htmlToText(rawValue) : cleanText(rawValue);
  const lines = source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim());
  const messages: ArchiveMessage[] = [];
  let index = 0;
  let guard = 0;

  while (index < lines.length) {
    guard += 1;
    if (guard > lines.length * 8 + 16) {
      throw new Error("聊天记录解析没有向前推进。");
    }
    const line = lines[index];
    if (!line) {
      index += 1;
      continue;
    }

    if (
      index + 1 < lines.length &&
      TIMESTAMP.test(lines[index + 1]) &&
      line.length <= 40 &&
      !/[。！？!?]/.test(line)
    ) {
      const sender = line;
      const timestampLine = lines[index + 1];
      index += 2;
      const body: string[] = [];
      while (index < lines.length && !isLikelyHeader(lines, index)) {
        if (lines[index]) body.push(lines[index]);
        index += 1;
      }
      messages.push(
        createMessage(sender, timestampLine, body, messages.length, parseDate(timestampLine))
      );
      continue;
    }

    const timestamp = line.match(TIMESTAMP)?.[0] ?? "";
    if (timestamp) {
      const withoutTimestamp = line
        .replace(timestamp, " ")
        .replace(/^[\s|[\]·—-]+|[\s|[\]·—-]+$/g, "");
      const senderAndBody = withoutTimestamp.match(/^([^:：]{1,24})[:：]\s*(.*)$/);
      const sender = senderAndBody?.[1] ?? withoutTimestamp;
      const inlineBody = senderAndBody?.[2] ?? "";
      index += 1;
      const body = inlineBody ? [inlineBody] : [];
      if (!inlineBody) {
        while (
          index < lines.length &&
          !isLikelyHeader(lines, index) &&
          !TIMESTAMP.test(lines[index])
        ) {
          if (lines[index]) body.push(lines[index]);
          index += 1;
        }
      }
      messages.push(createMessage(sender, timestamp, body, messages.length, parseDate(timestamp)));
      continue;
    }

    const inline = line.match(/^((?!https?$)[^:：]{1,28})[:：]\s*(.+)$/);
    if (inline) {
      messages.push(
        createMessage(inline[1], "", [inline[2]], messages.length, null)
      );
      index += 1;
      continue;
    }

    messages.push(createMessage("聊天记录", "", [line], messages.length, null));
    index += 1;
  }

  return messages.filter((message) => message.body.trim().length > 0);
}

function decodeBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("gb18030").decode(bytes);
    } catch {
      return strFromU8(bytes);
    }
  }
}

function mimeForName(name: string): string | null {
  const extension = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    pdf: "application/pdf"
  };
  return extension ? map[extension] ?? null : null;
}

function isTextEntry(name: string): boolean {
  return /\.(txt|html?|json|md)$/i.test(name);
}

function textEntryScore(name: string): number {
  const lower = name.toLowerCase();
  let score = 0;
  if (/聊天记录|chat|message|transcript|log/.test(lower)) score += 20;
  if (/\.txt$/i.test(lower)) score += 10;
  if (/\.json$/i.test(lower)) score += 8;
  if (/\.html?$/i.test(lower)) score += 5;
  return score;
}

function reconstructMedia(archive: ChatArchive): ArchiveMedia[] {
  const mediaByBaseName = new Map(
    archive.media.map((media) => [media.name.split("/").pop()?.toLowerCase() ?? media.name, media])
  );
  for (const message of archive.messages) {
    const matches: ArchiveMedia[] = [];
    for (const [baseName, media] of mediaByBaseName) {
      if (baseName && message.body.toLowerCase().includes(baseName)) {
        matches.push(media);
      }
    }
    message.media = [...new Map(matches.map((item) => [item.id, item])).values()];
  }
  return archive.media;
}

function normalizeArchive(
  fileName: string,
  fileSize: number,
  source: ChatArchive["source"],
  messages: ArchiveMessage[],
  media: ArchiveMedia[]
): ChatArchive {
  const ordered = messages
    .filter((message) => message.body.trim())
    .sort((left, right) => {
      if (!left.timestamp || !right.timestamp) return 0;
      return left.timestamp.getTime() - right.timestamp.getTime();
    })
    .map((message, index) => ({ ...message, id: makeID("message", index) }));
  const participants = [...new Set(ordered.map((message) => message.sender))]
    .filter(Boolean)
    .slice(0, 8);
  const archive: ChatArchive = {
    id: `archive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName,
    fileSize,
    source,
    messages: ordered,
    media,
    participants
  };
  reconstructMedia(archive);
  return archive;
}

function archiveFromJSON(fileName: string, fileSize: number, text: string): ChatArchive {
  const parsed = JSON.parse(text) as {
    messages?: Array<{
      sender?: string;
      author?: string;
      timestamp?: string;
      time?: string;
      body?: string;
      text?: string;
      content?: string;
    }>;
  };
  if (!Array.isArray(parsed.messages)) {
    throw new Error("JSON 中没有找到 messages 数组。");
  }
  const messages = parsed.messages.map((item, index) => {
    const timestampLabel = item.timestamp ?? item.time ?? "";
    return createMessage(
      item.sender ?? item.author ?? "聊天记录",
      timestampLabel,
      [item.body ?? item.text ?? item.content ?? ""],
      index,
      parseDate(timestampLabel)
    );
  });
  return normalizeArchive(fileName, fileSize, "json", messages, []);
}

export async function parseArchiveFile(file: File): Promise<ChatArchive> {
  if (file.size > MAX_ARCHIVE_BYTES) {
    throw new Error("文件超过演示上限 40 MB。");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".zip")) {
    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(bytes);
    } catch {
      throw new Error("这个 ZIP 无法解压，可能已损坏或使用了不支持的压缩格式。");
    }
    const unpackedSize = Object.values(entries).reduce((sum, entry) => sum + entry.byteLength, 0);
    if (unpackedSize > MAX_UNPACKED_BYTES) {
      throw new Error("ZIP 解压后超过演示上限 120 MB。");
    }

    const textCandidates = Object.entries(entries)
      .filter(([name]) => isTextEntry(name))
      .sort(([left], [right]) => textEntryScore(right) - textEntryScore(left));
    if (textCandidates.length === 0) {
      throw new Error("ZIP 中没有找到 TXT、HTML 或 JSON 聊天记录。");
    }
    const transcript = decodeBytes(textCandidates[0][1]);
    const messages = textCandidates[0][0].toLowerCase().endsWith(".json")
      ? archiveFromJSON(file.name, file.size, transcript).messages
      : parseTranscript(transcript);

    const media: ArchiveMedia[] = [];
    for (const [name, data] of Object.entries(entries)) {
      if (media.length >= MAX_MEDIA_PREVIEWS) break;
      const mime = mimeForName(name);
      if (!mime) continue;
      media.push({
        id: makeID("media", media.length),
        name,
        mime,
        size: data.byteLength,
        url: URL.createObjectURL(new Blob([data.slice().buffer], { type: mime }))
      });
    }
    return normalizeArchive(file.name, file.size, "zip", messages, media);
  }

  if (lowerName.endsWith(".json")) {
    return archiveFromJSON(file.name, file.size, decodeBytes(bytes));
  }
  if (lowerName.endsWith(".txt") || lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
    const text = decodeBytes(bytes);
    return normalizeArchive(file.name, file.size, "txt", parseTranscript(text), []);
  }
  throw new Error("请选择微信聊天记录 ZIP、TXT、HTML 或 JSON 文件。");
}

export function filesFromTransfer(transfer: DataTransfer | null): File[] {
  if (!transfer) return [];
  const buffers: File[] = Array.from(transfer.files);
  if (buffers.length > 0) return buffers;
  for (const item of Array.from(transfer.items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) buffers.push(file);
  }
  return buffers;
}

function uniqueActionCandidates(messages: ArchiveMessage[]): ActionItem[] {
  const seen = new Set<string>();
  const actions: ActionItem[] = [];
  for (const message of messages) {
    for (const sentence of message.body.split(/(?<=[。！？!?\n])/g)) {
      const value = sentence.trim().replace(/\s+/g, " ");
      if (!value || value.length < 5 || !TASK_WORDS.test(value)) continue;
      const key = value.replace(/[，。！？!?；;：:\s]/g, "").slice(0, 48);
      if (seen.has(key)) continue;
      seen.add(key);
      actions.push({
        id: `action-${actions.length + 1}`,
        text: value.slice(0, 140),
        source: message.sender,
        due: value.match(DUE_WORDS)?.[0] ?? null
      });
      if (actions.length >= 5) return actions;
    }
  }
  return actions;
}

export function summarizeArchive(archive: ChatArchive): ChatSummary {
  const dated = archive.messages.filter((message) => message.timestamp);
  const start = dated[0]?.timestamp ?? null;
  const end = dated.at(-1)?.timestamp ?? null;
  const range =
    start && end
      ? `${formatArchiveTime(start)} — ${formatArchiveTime(end)}`
      : start
        ? formatArchiveTime(start)
        : "时间信息未标注";
  const participantLabel = archive.participants.slice(0, 4).join("、") || "未知参与者";
  const highlightCandidates = archive.messages
    .filter((message) => CONCLUSION_WORDS.test(message.body))
    .map((message) => `${message.sender}：${message.body.replace(/\s+/g, " ").slice(0, 120)}`);
  const fallback = archive.messages
    .slice(-4)
    .map((message) => `${message.sender}：${message.body.replace(/\s+/g, " ").slice(0, 120)}`);
  return {
    headline: `已解析 ${archive.messages.length} 条消息`,
    overview: `${participantLabel} 的对话，包含 ${archive.media.length} 个可预览媒体文件。内容只在当前浏览器内处理。`,
    range,
    highlights: [...new Set(highlightCandidates.length ? highlightCandidates : fallback)].slice(0, 4),
    actions: uniqueActionCandidates(archive.messages)
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kilobytes = bytes / 1024;
    return `${Number.isInteger(kilobytes) ? kilobytes : kilobytes.toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function revokeArchiveURLs(archive: ChatArchive | null): void {
  if (!archive) return;
  for (const media of archive.media) {
    if (media.url.startsWith("blob:")) URL.revokeObjectURL(media.url);
  }
}
