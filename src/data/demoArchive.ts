import type { ArchiveMedia, ArchiveMessage, ChatArchive } from "../types";

const preflightArtwork =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 460">
      <defs>
        <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#d9edff"/><stop offset="1" stop-color="#9ac8ff"/>
        </linearGradient>
        <filter id="s"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-opacity=".15"/></filter>
      </defs>
      <rect width="720" height="460" rx="30" fill="url(#a)"/>
      <circle cx="612" cy="82" r="88" fill="#f8d778" opacity=".9"/>
      <rect x="58" y="70" width="426" height="294" rx="22" fill="white" filter="url(#s)"/>
      <rect x="88" y="104" width="128" height="11" rx="5" fill="#1a2f29"/>
      <rect x="88" y="139" width="300" height="8" rx="4" fill="#d8e1e0"/>
      <rect x="88" y="164" width="260" height="8" rx="4" fill="#d8e1e0"/>
      <rect x="88" y="204" width="156" height="104" rx="16" fill="#e9f4ff"/>
      <path d="M122 282l31-38 30 26 27-35 30 47H122z" fill="#4e8dff" opacity=".78"/>
      <rect x="264" y="214" width="172" height="9" rx="4" fill="#cbd7d6"/>
      <rect x="264" y="240" width="138" height="9" rx="4" fill="#cbd7d6"/>
      <rect x="264" y="276" width="116" height="32" rx="16" fill="#1cad7a"/>
    </svg>
  `);

const demoMedia: ArchiveMedia[] = [
  {
    id: "media-demo-1",
    name: "验收白板.png",
    mime: "image/svg+xml",
    size: 186420,
    url: preflightArtwork
  }
];

const demoMessages: ArchiveMessage[] = [
  {
    id: "message-demo-1",
    sender: "阿禾",
    timestamp: new Date(2026, 9, 28, 9, 47),
    timestampLabel: "10/28 09:47",
    body: "明天下午三点前把最终验收材料发群里，流程图和截图都补齐。",
    media: []
  },
  {
    id: "message-demo-2",
    sender: "林舟",
    timestamp: new Date(2026, 9, 28, 9, 49),
    timestampLabel: "10/28 09:49",
    body: "收到。我会补一版接口链路图，把失败重试和回滚范围标清楚。",
    media: []
  },
  {
    id: "message-demo-3",
    sender: "周屿",
    timestamp: new Date(2026, 9, 28, 9, 51),
    timestampLabel: "10/28 09:51",
    body: "[图片] 验收白板.png",
    media: demoMedia
  },
  {
    id: "message-demo-4",
    sender: "阿禾",
    timestamp: new Date(2026, 9, 28, 9, 53),
    timestampLabel: "10/28 09:53",
    body: "结论先定为：核心链路必须可复测，演示数据可以合成，但不能伪装成真实订单。",
    media: []
  },
  {
    id: "message-demo-5",
    sender: "林舟",
    timestamp: new Date(2026, 9, 28, 9, 56),
    timestampLabel: "10/28 09:56",
    body: "记得把临时文件和测试账号清理记录也放进验收说明。",
    media: []
  },
  {
    id: "message-demo-6",
    sender: "周屿",
    timestamp: new Date(2026, 9, 28, 10, 1),
    timestampLabel: "10/28 10:01",
    body: "周五中午前我再跑一次完整回归，结果直接回复在这条下面。",
    media: []
  },
  {
    id: "message-demo-7",
    sender: "阿禾",
    timestamp: new Date(2026, 9, 28, 10, 3),
    timestampLabel: "10/28 10:03",
    body: "好的，先按这个口径推进。",
    media: []
  }
];

export const DEMO_ARCHIVE: ChatArchive = {
  id: "demo-archive",
  fileName: "聊天记录_项目验收_演示.zip",
  fileSize: 1_842_064,
  source: "zip",
  messages: demoMessages,
  media: demoMedia,
  participants: ["阿禾", "林舟", "周屿"]
};
