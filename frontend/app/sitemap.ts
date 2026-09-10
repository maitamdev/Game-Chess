import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const publicRoutes = [
  "/",
  "/games",
  "/cards",
  "/minigames",
  "/leaderboard",
  "/tournaments",
  "/reversi",
  "/connect4",
  "/coganh",
  "/covay",
  "/checkers",
  "/draughts",
  "/dots",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
