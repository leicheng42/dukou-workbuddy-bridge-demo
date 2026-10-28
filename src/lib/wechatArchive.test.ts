import { strToU8, zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import type { ChatArchive } from "../types";
import {
  formatFileSize,
  parseArchiveFile,
  parseTranscript,
  summarizeArchive
} from "./wechatArchive";

describe("parseTranscript", () => {
  it("reads sender / timestamp / content triplets", () => {
    const messages = parseTranscript(`
      阿禾
      2026-10-28 09:47:12
      明天下午三点前把最终验收材料发群里。

      林舟
      2026-10-28 09:49:05
      收到，我补一版接口链路图。
    `);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      sender: "阿禾",
      timestampLabel: "10/28 09:47"
    });
    expect(messages[1].body).toContain("接口链路图");
  });

  it("reads timestamp-first and inline sender formats", () => {
    const messages = parseTranscript(`
      [2026-10-28 10:01:00] 周屿: 周五中午前再跑一次完整回归。
      阿禾：好的，先按这个口径推进。
    `);

    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe("周屿");
    expect(messages[0].body).toContain("完整回归");
    expect(messages[1].sender).toBe("阿禾");
  });

  it("reads simple exported lines and HTML", () => {
    const messages = parseTranscript(`
      <html><body>
        <p>聊天记录：现在上课还是做题呀</p>
        <p>聊天记录：专心听课</p>
      </body></html>
    `);

    expect(messages).toHaveLength(2);
    expect(messages[1].body).toBe("专心听课");
    expect(messages.every((message) => message.sender === "聊天记录")).toBe(true);
  });
});

describe("parseArchiveFile", () => {
  it("unpacks a WeChat-style ZIP and finds media", async () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-media");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const bytes = zipSync({
      "聊天记录.txt": strToU8(`
        阿禾
        2026-10-28 09:47:00
        这是结论。

        周屿
        2026-10-28 09:51:00
        [图片] demo.png
      `),
      "聊天记录内的图片/demo.png": new Uint8Array([137, 80, 78, 71])
    });
    const file = new File([bytes], "聊天记录_20261028.zip", { type: "application/zip" });

    const archive = await parseArchiveFile(file);

    expect(archive.messages).toHaveLength(2);
    expect(archive.media).toHaveLength(1);
    expect(archive.messages[1].media[0].name).toBe("聊天记录内的图片/demo.png");
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});

describe("summarizeArchive", () => {
  it("extracts a compact overview and action candidates", () => {
    const archive: ChatArchive = {
      id: "test",
      fileName: "chat.zip",
      fileSize: 2048,
      source: "zip",
      participants: ["阿禾", "林舟"],
      media: [],
      messages: [
        {
          id: "1",
          sender: "阿禾",
          timestamp: new Date(2026, 9, 28, 9, 47),
          timestampLabel: "10/28 09:47",
          body: "明天下午三点前把最终材料发到群里。",
          media: []
        },
        {
          id: "2",
          sender: "林舟",
          timestamp: new Date(2026, 9, 28, 9, 49),
          timestampLabel: "10/28 09:49",
          body: "收到，我补一版链路图。",
          media: []
        }
      ]
    };

    const summary = summarizeArchive(archive);

    expect(summary.headline).toBe("已解析 2 条消息");
    expect(summary.range).toContain("10/28");
    expect(summary.actions[0].due).toBe("明天");
    expect(summary.actions[0].source).toBe("阿禾");
  });
});

describe("formatFileSize", () => {
  it("uses readable units", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
