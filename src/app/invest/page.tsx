import { redirect } from "next/navigation";
import { OuterShell } from "@/sites/zode/components/OuterShell";
import { Section } from "@/sites/zode/components/Section";
import { Cover, COVER_ID } from "@/sites/zode/components/Cover";
import { SECTIONS } from "@/sites/zode/content/sections";
import { isAuthenticated } from "@/sites/zode/lib/session";

export default async function Invest() {
  // Defense in depth: proxy.ts already gates this route, but re-check
  // here so content is never rendered without a valid session.
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  const railSections = SECTIONS.map(({ id, label }) => ({ id, label }));

  return (
    <OuterShell sections={railSections} coverId={COVER_ID}>
      <Cover />
      {SECTIONS.map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </OuterShell>
  );
}
