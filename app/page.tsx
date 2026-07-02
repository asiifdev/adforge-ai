import Link from "next/link";
import {
  Zap,
  Globe,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Layers,
  Copy,
  Languages,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth";

const platforms = [
  {
    name: "Google Ads RSA",
    detail: "15 headlines (≤30 chars) + 4 descriptions (≤90 chars)",
  },
  {
    name: "Meta Ads",
    detail: "Primary text, headline, description & CTA — 3 full variants",
  },
  {
    name: "TikTok Ads",
    detail: "Hook / body / CTA scripts written for spoken delivery",
  },
  {
    name: "Taboola",
    detail: "Curiosity-gap headlines, body copy & branding text",
  },
];

const features = [
  {
    icon: Zap,
    title: "Streamed generation",
    text: "Watch every variation appear in real time — no waiting on a spinner for the whole batch.",
  },
  {
    icon: ShieldCheck,
    title: "Limits enforced in code",
    text: "Character limits are validated with Zod and truncated server-side, not just requested in a prompt.",
  },
  {
    icon: Layers,
    title: "Star, label & compare",
    text: "Mark favorites, assign A/B/C/D labels, add notes, and compare two variations side by side.",
  },
  {
    icon: Copy,
    title: "Export anywhere",
    text: "CSV formatted for Ads Editor and Ads Manager, plus JSON and PDF exports.",
  },
  {
    icon: Languages,
    title: "English or Indonesian",
    text: "Generate briefs and ad copy in either language from the same workspace.",
  },
  {
    icon: BarChart3,
    title: "Duplicate & iterate",
    text: "Clone a project with its brief intact to test new angles without starting over.",
  },
];

export default async function Home() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">AdForge AI</span>
          </div>
          <nav className="flex items-center gap-2">
            {session ? (
              <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                  Sign in
                </Link>
                <Link href="/register" className={buttonVariants({ size: "lg" })}>
                  Get started free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
          <Badge variant="secondary" className="mx-auto">
            <Sparkles className="text-indigo-600" />
            AI-powered ad creative generation
          </Badge>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Platform-native ad copy, generated in seconds
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Enter a campaign brief once. Get launch-ready copy for Google Ads,
            Meta Ads, TikTok Ads, and Taboola — every character limit and
            format requirement enforced automatically.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href={session ? "/dashboard" : "/register"}
              className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base")}
            >
              {session ? "Go to dashboard" : "Start generating for free"}
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-6 text-base")}
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Platforms */}
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platforms.map((p) => (
              <Card key={p.name} className="px-5">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-semibold text-foreground">{p.name}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.detail}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Built for media buyers, not prompt engineers
              </h2>
              <p className="mt-3 text-muted-foreground">
                Everything you need to go from brief to launch-ready creative,
                without reformatting or manual character counting.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600/10">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Stop reformatting copy by hand
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Create your first project and generate a full set of
            platform-compliant ad variations in under a minute.
          </p>
          <Link
            href={session ? "/dashboard" : "/register"}
            className={cn(buttonVariants({ size: "lg" }), "mt-8 h-11 px-6 text-base")}
          >
            {session ? "Go to dashboard" : "Get started free"}
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} AdForge AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
