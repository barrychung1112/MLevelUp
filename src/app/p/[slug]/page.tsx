import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPortfolioView } from "@/components/features/portfolio/public-portfolio-view";
import { readPublicPortfolio } from "@/portfolio/public-portfolio-reader";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = await readPublicPortfolio(slug);
  if (!portfolio) return { title: "Portfolio unavailable · MLevelUp" };
  return {
    title: `${portfolio.profile.displayName} · ML Portfolio`,
    description: portfolio.profile.headline,
    robots: { index: true, follow: true },
  };
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { slug } = await params;
  const portfolio = await readPublicPortfolio(slug);
  if (!portfolio) notFound();
  return <PublicPortfolioView portfolio={portfolio} />;
}
