import { config } from "dotenv";
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
config({ path: ".env.local" });
config();
if (!process.env.DEMO_PASSWORD)
  throw new Error("Set DEMO_PASSWORD and run npm run seed:demo first.");
const base = process.env.PREVIEW_URL || "http://localhost:3000";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER_PATH
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER_PATH }
    : {}),
});
const errors: string[] = [];
try {
  await mkdir("docs/screenshots", { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/login");
  await page.getByLabel("Email address").fill("freelancer@clientdesk.demo");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.DEMO_PASSWORD);
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back, Ian." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link").filter({ hasText: "Savanna brand identity" }),
  ).toBeVisible();
  const dashboard = page.url();
  await page.evaluate(() => document.fonts.ready);
  if (
    !(await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily.includes("Montserrat"),
    ))
  )
    throw new Error("Montserrat is not applied");
  await page.screenshot({
    path: "docs/screenshots/dashboard.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("link")
    .filter({ hasText: "Savanna brand identity" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Savanna brand identity" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Visual identity", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/project.png",
    fullPage: true,
    animations: "disabled",
  });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await mobile.context().addCookies(await page.context().cookies());
  await mobile.goto(dashboard);
  await expect(
    mobile.getByRole("link").filter({ hasText: "Savanna brand identity" }),
  ).toBeVisible();
  await mobile.evaluate(() => document.fonts.ready);
  if (
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw new Error("Mobile dashboard overflows");
  await mobile.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  const client = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  client.on("pageerror", (error) => errors.push(error.message));
  await client.goto(base + "/login");
  await client.getByLabel("Email address").fill("client@clientdesk.demo");
  await client
    .getByLabel("Password", { exact: true })
    .fill(process.env.DEMO_PASSWORD);
  await client.getByRole("button", { name: /^Sign in/ }).click();
  await expect(
    client.getByRole("link").filter({ hasText: "Savanna brand identity" }),
  ).toBeVisible();
  await client
    .getByRole("link")
    .filter({ hasText: "Savanna brand identity" })
    .click();
  await expect(
    client.getByRole("button", { name: "Approve milestone" }),
  ).toBeVisible();
  await client.screenshot({
    path: "docs/screenshots/client-project.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto(base + "/register");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/screenshots/register.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto(base + "/");
  await page.screenshot({
    path: "docs/screenshots/landing.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const surface of [page, client, mobile])
    await surface.evaluate(() =>
      fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
  if (errors.length) throw new Error(errors.join("\n"));
  console.info(
    "Seeded desktop/client/mobile UI checked. Screenshots refreshed.",
  );
} finally {
  await browser.close();
}
