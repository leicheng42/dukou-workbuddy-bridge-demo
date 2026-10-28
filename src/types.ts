export type ArchiveSource = "zip" | "txt" | "json";

export interface ArchiveMedia {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
}

export interface ArchiveMessage {
  id: string;
  sender: string;
  timestamp: Date | null;
  timestampLabel: string;
  body: string;
  media: ArchiveMedia[];
}

export interface ChatArchive {
  id: string;
  fileName: string;
  fileSize: number;
  source: ArchiveSource;
  messages: ArchiveMessage[];
  media: ArchiveMedia[];
  participants: string[];
}

export interface ActionItem {
  id: string;
  text: string;
  source: string;
  due: string | null;
}

export interface ChatSummary {
  headline: string;
  overview: string;
  range: string;
  highlights: string[];
  actions: ActionItem[];
}
