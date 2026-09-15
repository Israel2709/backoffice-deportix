import { Shell } from "@/components/layout/shell";

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
