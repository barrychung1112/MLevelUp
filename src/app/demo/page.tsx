import { GuidedDemo } from "@/demo/guided-demo";

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ restart?: string }> }) {
  const params = await searchParams;
  return <GuidedDemo restart={params.restart === "1"} />;
}
