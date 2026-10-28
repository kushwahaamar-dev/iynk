import type { SVGProps } from "react";
import { AirplaneTilt } from "@phosphor-icons/react/dist/ssr/AirplaneTilt";
import { ArrowClockwise } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUUpLeft } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { ArrowsCounterClockwise } from "@phosphor-icons/react/dist/ssr/ArrowsCounterClockwise";
import { ArrowsOut } from "@phosphor-icons/react/dist/ssr/ArrowsOut";
import { BookOpen } from "@phosphor-icons/react/dist/ssr/BookOpen";
import { CaretDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ChatCircle } from "@phosphor-icons/react/dist/ssr/ChatCircle";
import { Check } from "@phosphor-icons/react/dist/ssr/Check";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { Code } from "@phosphor-icons/react/dist/ssr/Code";
import { Command } from "@phosphor-icons/react/dist/ssr/Command";
import { Copy } from "@phosphor-icons/react/dist/ssr/Copy";
import { Cpu } from "@phosphor-icons/react/dist/ssr/Cpu";
import { Crosshair } from "@phosphor-icons/react/dist/ssr/Crosshair";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { Eye } from "@phosphor-icons/react/dist/ssr/Eye";
import { Fan } from "@phosphor-icons/react/dist/ssr/Fan";
import { GearSix } from "@phosphor-icons/react/dist/ssr/GearSix";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr/GithubLogo";
import { Globe } from "@phosphor-icons/react/dist/ssr/Globe";
import { House } from "@phosphor-icons/react/dist/ssr/House";
import { Info } from "@phosphor-icons/react/dist/ssr/Info";
import { Key } from "@phosphor-icons/react/dist/ssr/Key";
import { Keyboard } from "@phosphor-icons/react/dist/ssr/Keyboard";
import { Lightbulb } from "@phosphor-icons/react/dist/ssr/Lightbulb";
import { Lightning } from "@phosphor-icons/react/dist/ssr/Lightning";
import { LinkSimple } from "@phosphor-icons/react/dist/ssr/LinkSimple";
import { List } from "@phosphor-icons/react/dist/ssr/List";
import { Lock } from "@phosphor-icons/react/dist/ssr/Lock";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { Microphone } from "@phosphor-icons/react/dist/ssr/Microphone";
import { PaperPlaneRight } from "@phosphor-icons/react/dist/ssr/PaperPlaneRight";
import { Play } from "@phosphor-icons/react/dist/ssr/Play";
import { Robot } from "@phosphor-icons/react/dist/ssr/Robot";
import { ShareNetwork } from "@phosphor-icons/react/dist/ssr/ShareNetwork";
import { SidebarSimple } from "@phosphor-icons/react/dist/ssr/SidebarSimple";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { Sparkle } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { SpeakerHigh } from "@phosphor-icons/react/dist/ssr/SpeakerHigh";
import { SpeakerSlash } from "@phosphor-icons/react/dist/ssr/SpeakerSlash";
import { Stop } from "@phosphor-icons/react/dist/ssr/Stop";
import { Tray } from "@phosphor-icons/react/dist/ssr/Tray";
import { UsersThree } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { Warning } from "@phosphor-icons/react/dist/ssr/Warning";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { WarningOctagon } from "@phosphor-icons/react/dist/ssr/WarningOctagon";
import { Wrench } from "@phosphor-icons/react/dist/ssr/Wrench";
import { X } from "@phosphor-icons/react/dist/ssr/X";

export type IconName =
  | "close"
  | "menu"
  | "check"
  | "copy"
  | "chevron-right"
  | "chevron-left"
  | "chevron-down"
  | "info"
  | "tip"
  | "warn"
  | "danger"
  | "globe"
  | "board"
  | "robot"
  | "drone"
  | "play"
  | "external"
  | "keyboard"
  | "settings"
  | "tools"
  | "sound-on"
  | "sound-off"
  | "rotate-left"
  | "rotate-right"
  | "target"
  | "reset"
  | "expand"
  | "lock"
  | "undo"
  | "panel-right"
  | "spark"
  | "people"
  | "share"
  | "mic"
  | "link"
  | "download"
  | "book"
  | "refresh"
  | "send"
  | "stop"
  | "chat"
  | "key"
  | "search"
  | "command"
  | "arrow-right"
  | "github"
  | "warn-circle"
  | "check-circle"
  | "empty"
  | "eye"
  | "code"
  | "bolt"
  | "fly"
  | "house"
  | "sliders";

const GLYPHS: Record<IconName, typeof X> = {
  close: X,
  menu: List,
  check: Check,
  copy: Copy,
  "chevron-right": CaretRight,
  "chevron-left": CaretLeft,
  "chevron-down": CaretDown,
  info: Info,
  tip: Lightbulb,
  warn: Warning,
  danger: WarningOctagon,
  globe: Globe,
  board: Cpu,
  robot: Robot,
  drone: Fan,
  play: Play,
  external: ArrowUpRight,
  keyboard: Keyboard,
  settings: GearSix,
  tools: Wrench,
  "sound-on": SpeakerHigh,
  "sound-off": SpeakerSlash,
  "rotate-left": ArrowCounterClockwise,
  "rotate-right": ArrowClockwise,
  target: Crosshair,
  reset: ArrowsCounterClockwise,
  expand: ArrowsOut,
  lock: Lock,
  undo: ArrowUUpLeft,
  "panel-right": SidebarSimple,
  spark: Sparkle,
  people: UsersThree,
  share: ShareNetwork,
  mic: Microphone,
  link: LinkSimple,
  download: DownloadSimple,
  book: BookOpen,
  refresh: ArrowsClockwise,
  send: PaperPlaneRight,
  stop: Stop,
  chat: ChatCircle,
  key: Key,
  search: MagnifyingGlass,
  command: Command,
  "arrow-right": ArrowRight,
  github: GithubLogo,
  "warn-circle": WarningCircle,
  "check-circle": CheckCircle,
  empty: Tray,
  eye: Eye,
  code: Code,
  bolt: Lightning,
  fly: AirplaneTilt,
  house: House,
  sliders: SlidersHorizontal,
};

export type IconSize = 16 | 20 | 24 | 32;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: IconSize } & SVGProps<SVGSVGElement>) {
  const Glyph = GLYPHS[name];
  return <Glyph {...rest} size={size} weight="regular" aria-hidden="true" focusable="false" />;
}
