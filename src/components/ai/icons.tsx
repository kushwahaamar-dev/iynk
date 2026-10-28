import { Icon } from "@/components/ui/icons";

export type PartnerIconName = "spark" | "mic" | "send" | "stop" | "share" | "download" | "link" | "book" | "chat" | "refresh" | "people";

export function PartnerIcon({ name, size }: { name: PartnerIconName; size?: number }) {
  return <Icon name={name} size={size} />;
}
