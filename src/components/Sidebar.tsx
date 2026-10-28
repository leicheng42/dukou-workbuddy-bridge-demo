import {
  Bell,
  BookOpen,
  Bot,
  Boxes,
  CalendarClock,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  Inbox,
  Library,
  MoreHorizontal,
  Plus,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  onDemo: () => void;
}

const navItems = [
  { icon: Plus, label: "新建任务" },
  { icon: Bot, label: "助理", badge: "BETA" },
  { icon: Boxes, label: "专家 · 技能 · 连接器" },
  { icon: CalendarClock, label: "定时任务" },
  { icon: Library, label: "资料库" },
  { icon: MoreHorizontal, label: "更多" }
];

export function Sidebar({ onDemo }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="window-controls" aria-hidden="true">
        <span className="window-controls__red" />
        <span className="window-controls__amber" />
        <span className="window-controls__green" />
      </div>

      <div className="sidebar__brand">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <i />
        </div>
        <div>
          <strong>Relay Chat</strong>
          <span>Dukou receiver demo</span>
        </div>
        <button className="sidebar__discover" type="button" onClick={onDemo}>
          <Sparkles size={13} />
          体验
        </button>
      </div>

      <nav className="sidebar__nav" aria-label="应用导航">
        {navItems.map(({ icon: Icon, label, badge }, index) => (
          <button
            className={index === 0 ? "sidebar__nav-item is-emphasis" : "sidebar__nav-item"}
            type="button"
            key={label}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span>{label}</span>
            {badge ? <em>{badge}</em> : null}
          </button>
        ))}
      </nav>

      <div className="sidebar__section-heading">
        <span>任务</span>
        <span>11</span>
      </div>
      <div className="sidebar__task-list">
        <button className="sidebar__task is-active" type="button">
          <span className="task-dot is-blue" />
          <span>
            <strong>总结聊天记录要点和待办</strong>
            <small>刚刚</small>
          </span>
        </button>
        <button className="sidebar__task" type="button">
          <span className="task-dot is-yellow" />
          <span>
            <strong>分析验收材料与风险</strong>
            <small>2 天前</small>
          </span>
        </button>
        <button className="sidebar__task" type="button">
          <span className="task-dot is-green" />
          <span>
            <strong>整理群聊里的行动项</strong>
            <small>10 月 12 日</small>
          </span>
        </button>
      </div>

      <div className="sidebar__section-heading">
        <span>空间</span>
        <ChevronDown size={13} />
      </div>
      <div className="sidebar__space">
        <Command size={15} />
        <span>Dukou bridge</span>
      </div>

      <div className="sidebar__bottom">
        <button className="sidebar__profile" type="button">
          <span className="profile-avatar">磊</span>
          <span>
            <strong>本地演示</strong>
            <small>文件不会上传</small>
          </span>
          <Bell size={15} />
        </button>
        <div className="sidebar__quick" aria-label="快捷状态">
          <Inbox size={15} />
          <Clock3 size={15} />
          <CircleHelp size={15} />
          <BookOpen size={15} />
        </div>
      </div>
    </aside>
  );
}
