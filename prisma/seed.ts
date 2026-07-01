import { config } from "dotenv";
// Do not override a DATABASE_URL the caller already set (e.g. via `dotenv -e
// .env.test --`) — forcing .env.local here would silently defeat that and
// the safety guard below, seeding whatever .env.local points to instead.
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// This seed ships known demo credentials (demo@adforge.ai / password123) —
// never let it run against production or an unrecognized remote database.
const databaseUrl = process.env.DATABASE_URL ?? "";
const looksLocal = /^postgresql:\/\/[^/]*@?(localhost|127\.0\.0\.1|postgres|::1)[:/]/.test(databaseUrl);

if (process.env.NODE_ENV === "production") {
  console.error("❌ Refusing to run the demo seed with NODE_ENV=production.");
  process.exit(1);
}

if (!looksLocal && process.env.ALLOW_SEED_NON_LOCAL !== "true") {
  console.error(
    "❌ DATABASE_URL doesn't look like a local/dev database. Refusing to seed known demo credentials into it.\n" +
      "   If this really is safe (a disposable/test database), set ALLOW_SEED_NON_LOCAL=true and re-run."
  );
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Demo user
  const passwordHash = await bcrypt.hash("password123", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@adforge.ai" },
    update: {},
    create: {
      email: "demo@adforge.ai",
      passwordHash,
      name: "Demo User",
    },
  });
  console.log(`✅ User: ${user.email}`);

  // Project 1 — E-commerce (with generated variations)
  const project1 = await prisma.project.upsert({
    where: { id: "seed-project-ecom" },
    update: {},
    create: {
      id: "seed-project-ecom",
      userId: user.id,
      name: "Summer Sale Campaign",
      status: "generated",
    },
  });

  const brief1 = await prisma.brief.upsert({
    where: { projectId: project1.id },
    update: {},
    create: {
      projectId: project1.id,
      productName: "FlashWear — Premium Athletic Wear",
      description:
        "FlashWear is a direct-to-consumer athletic clothing brand offering premium-quality gym wear at 40% below retail prices. Free shipping on all orders over $50.",
      landingUrl: "https://flashwear.example.com",
      targetAudience:
        "Fitness enthusiasts aged 22–40, frequent gym-goers, health-conscious consumers who want quality without paying premium brand prices",
      goal: "conversions",
      tone: "aggressive",
      budgetRange: "$3,000/day",
      platforms: ["google", "meta"],
      variationsPerPlatform: 3,
    },
  });

  const creativeSetGoogle = await prisma.creativeSet.upsert({
    where: { id: "seed-cs-google-ecom" },
    update: {},
    create: {
      id: "seed-cs-google-ecom",
      projectId: project1.id,
      briefId: brief1.id,
      platform: "google",
    },
  });

  const googleVariations = [
    {
      id: "seed-var-google-1",
      position: 0,
      isFavorite: true,
      label: "A" as const,
      content: {
        headlines: [
          "Premium Gym Wear – 40% Off",
          "Free Shipping Over $50",
          "Shop FlashWear Today",
          "Top Athletic Wear Sale",
          "Quality Gym Clothes – Less",
          "Flash Sale – Ends Soon",
          "Beat the Heat This Summer",
          "New Arrivals Every Week",
          "Outperform in Style",
          "Gym Wear You'll Love",
          "No Monthly Fees – Just Style",
          "Fast Delivery Guaranteed",
          "4.9★ Customer Rating",
          "10,000+ Happy Athletes",
          "Limited Time Offer Now",
        ],
        descriptions: [
          "Shop premium athletic wear at 40% below retail. Free shipping on orders over $50. Limited summer stock — order today.",
          "FlashWear delivers gym-quality clothing without the premium price tag. 4.9-star rated by 10,000+ customers. Shop now.",
          "Don't pay full price for gym wear. FlashWear offers top-tier athletic clothing with free shipping. Sale ends soon.",
          "Join 10,000+ athletes who switched to FlashWear. Premium quality, unbeatable prices. Free shipping over $50.",
        ],
      },
    },
    {
      id: "seed-var-google-2",
      position: 1,
      isFavorite: false,
      label: "B" as const,
      content: {
        headlines: [
          "Summer Athletic Wear Sale",
          "40% Off All Gym Clothes",
          "Free Returns Always",
          "Workout in Style Today",
          "Shop Summer Collection",
          "Beats Big Brand Prices",
          "Fast & Free Shipping",
          "Rated #1 by Athletes",
          "Your Best Workout Gear",
          "New Drops Every Month",
          "Comfort Meets Performance",
          "Gym Wear That Lasts",
          "Join the FlashWear Fam",
          "Sale Ends This Weekend",
          "Order Today – Ship Fast",
        ],
        descriptions: [
          "Summer sale is live at FlashWear. Premium athletic wear up to 40% off with free shipping on $50+ orders. Shop before it's gone.",
          "Why overpay for gym clothes? FlashWear offers the same quality as top brands at a fraction of the cost. Free shipping included.",
          "FlashWear's summer collection is here. Performance fabric, modern cuts, unbeatable prices. Free shipping on orders over $50.",
          "Get summer-ready with FlashWear athletic wear. 40% off retail pricing, 4.9-star reviews, free shipping over $50.",
        ],
      },
    },
    {
      id: "seed-var-google-3",
      position: 2,
      isFavorite: false,
      label: null,
      content: {
        headlines: [
          "Gym Clothes – Huge Savings",
          "Athletic Wear Up to 40% Off",
          "Shop FlashWear Summer",
          "Performance at Low Price",
          "Free Ship on $50+ Orders",
          "Train Hard, Spend Less",
          "Premium Fit, Budget Price",
          "Bestselling Gym Sets",
          "New Colors In Stock",
          "Outfit Your Best Workout",
          "Top Rated Workout Gear",
          "Sweat in Style",
          "Built for Every Workout",
          "Satisfaction Guaranteed",
          "Order Now – Fast Shipping",
        ],
        descriptions: [
          "Train harder without breaking the bank. FlashWear gym wear is 40% below retail prices with free shipping on $50+ orders.",
          "FlashWear summer sale is on. Premium performance athletic wear for serious gym-goers at prices that make sense.",
          "10,000 athletes can't be wrong. FlashWear delivers top-quality gym clothes with free shipping and easy returns.",
          "This summer's best deal in athletic wear. FlashWear: premium quality, 40% off retail, free shipping over $50.",
        ],
      },
    },
  ];

  for (const v of googleVariations) {
    await prisma.variation.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        creativeSetId: creativeSetGoogle.id,
        platform: "google",
        content: v.content,
        isFavorite: v.isFavorite,
        label: v.label,
        position: v.position,
      },
    });
  }
  console.log(`✅ Google Ads variations: ${googleVariations.length}`);

  const creativeSetMeta = await prisma.creativeSet.upsert({
    where: { id: "seed-cs-meta-ecom" },
    update: {},
    create: {
      id: "seed-cs-meta-ecom",
      projectId: project1.id,
      briefId: brief1.id,
      platform: "meta",
    },
  });

  const metaVariations = [
    {
      id: "seed-var-meta-1",
      position: 0,
      isFavorite: true,
      label: "A" as const,
      content: {
        primaryText:
          "Stop overpaying for gym clothes. FlashWear gives you premium athletic wear at 40% below what you'd pay at big brands — free shipping included.",
        headline: "Premium Gym Wear, 40% Off",
        description: "Free shipping on $50+ orders",
        callToAction: "Shop Now",
      },
    },
    {
      id: "seed-var-meta-2",
      position: 1,
      isFavorite: false,
      label: "B" as const,
      content: {
        primaryText:
          "10,000+ athletes made the switch to FlashWear this year. Same performance quality, 40% less than what you're used to paying. What are you waiting for?",
        headline: "Join 10K+ FlashWear Athletes",
        description: "Rated 4.9★ — shop now",
        callToAction: "Get Offer",
      },
    },
    {
      id: "seed-var-meta-3",
      position: 2,
      isFavorite: false,
      label: null,
      content: {
        primaryText:
          "Summer sale is LIVE. FlashWear athletic wear up to 40% off — performance fabrics, modern fits, sizes for every body. Free shipping on orders over $50.",
        headline: "Summer Sale — Up to 40% Off",
        description: "Limited stock. Order today.",
        callToAction: "Shop Now",
      },
    },
  ];

  for (const v of metaVariations) {
    await prisma.variation.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        creativeSetId: creativeSetMeta.id,
        platform: "meta",
        content: v.content,
        isFavorite: v.isFavorite,
        label: v.label,
        position: v.position,
      },
    });
  }
  console.log(`✅ Meta Ads variations: ${metaVariations.length}`);

  // Project 2 — SaaS (draft, no variations yet)
  const project2 = await prisma.project.upsert({
    where: { id: "seed-project-saas" },
    update: {},
    create: {
      id: "seed-project-saas",
      userId: user.id,
      name: "SaaS Tool Launch",
      status: "draft",
    },
  });

  await prisma.brief.upsert({
    where: { projectId: project2.id },
    update: {},
    create: {
      projectId: project2.id,
      productName: "Taskly — Project Management for Remote Teams",
      description:
        "Taskly is a lightweight project management tool built for remote-first teams. Unlike Jira or Asana, it takes under 5 minutes to set up and has a flat learning curve. Starts at $9/user/month.",
      targetAudience:
        "Remote team leads and startup founders frustrated with over-engineered project management tools, 5–50 person teams",
      goal: "clicks",
      tone: "professional",
      platforms: ["google", "meta", "tiktok"],
      variationsPerPlatform: 5,
    },
  });
  console.log(`✅ Project 2 (SaaS draft): ${project2.name}`);

  // Project 3 — TikTok & Taboola
  const project3 = await prisma.project.upsert({
    where: { id: "seed-project-native" },
    update: {},
    create: {
      id: "seed-project-native",
      userId: user.id,
      name: "Supplement Brand — Native & Video",
      status: "generated",
    },
  });

  const brief3 = await prisma.brief.upsert({
    where: { projectId: project3.id },
    update: {},
    create: {
      projectId: project3.id,
      productName: "PureVitals Daily Greens",
      description:
        "PureVitals Daily Greens is a superfood powder supplement with 47 organic ingredients. One scoop replaces your morning multivitamin. Subscribe and save 30%.",
      targetAudience:
        "Health-conscious adults 25–45 who struggle to eat enough vegetables, busy professionals, biohackers, fitness enthusiasts",
      goal: "conversions",
      tone: "casual",
      platforms: ["tiktok", "taboola"],
      variationsPerPlatform: 2,
    },
  });

  const creativeSetTikTok = await prisma.creativeSet.upsert({
    where: { id: "seed-cs-tiktok" },
    update: {},
    create: {
      id: "seed-cs-tiktok",
      projectId: project3.id,
      briefId: brief3.id,
      platform: "tiktok",
    },
  });

  const tiktokVariations = [
    {
      id: "seed-var-tiktok-1",
      position: 0,
      isFavorite: true,
      label: "A" as const,
      content: {
        hook: "I stopped eating salads and my bloodwork got better.",
        body: "Sounds crazy, right? I switched to PureVitals Daily Greens — one scoop in the morning covers 47 superfoods, organic, no fillers. My energy is through the roof, brain fog is gone, and I'm not choking down 6 supplements anymore. I've been doing this for 90 days and I'm genuinely shocked.",
        cta: "Link in bio — subscribe and save 30% today.",
        onScreenText: ["47 organic superfoods", "One scoop = done", "Subscribe & save 30%"],
      },
    },
    {
      id: "seed-var-tiktok-2",
      position: 1,
      isFavorite: false,
      label: "B" as const,
      content: {
        hook: "If you're tired by 2pm every day, watch this.",
        body: "Most people are running on empty because they're not getting enough micronutrients — and you can eat 'healthy' and still miss the mark. PureVitals Daily Greens packs 47 organic superfoods into one scoop. I put it in water every morning, takes 30 seconds, and I haven't had an afternoon crash in three months.",
        cta: "Tap the link to try it — first order ships free.",
        onScreenText: ["Afternoon crashes?", "47 superfoods in 1 scoop", "Free shipping first order"],
      },
    },
  ];

  for (const v of tiktokVariations) {
    await prisma.variation.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        creativeSetId: creativeSetTikTok.id,
        platform: "tiktok",
        content: v.content,
        isFavorite: v.isFavorite,
        label: v.label,
        position: v.position,
      },
    });
  }
  console.log(`✅ TikTok variations: ${tiktokVariations.length}`);

  const creativeSetTaboola = await prisma.creativeSet.upsert({
    where: { id: "seed-cs-taboola" },
    update: {},
    create: {
      id: "seed-cs-taboola",
      projectId: project3.id,
      briefId: brief3.id,
      platform: "taboola",
    },
  });

  const taboolaVariations = [
    {
      id: "seed-var-taboola-1",
      position: 0,
      isFavorite: false,
      label: null,
      content: {
        headline: "Why Doctors Are Rethinking Multivitamins",
        bodyText:
          "A growing number of nutritionists say traditional multivitamins miss the mark. PureVitals Daily Greens packs 47 organic superfoods into one morning scoop — and the results are turning heads.",
        thumbnailDescription:
          "Close-up of green superfood powder in a glass jar, morning sunlight, clean white kitchen background, health-focused lifestyle",
      },
    },
    {
      id: "seed-var-taboola-2",
      position: 1,
      isFavorite: false,
      label: null,
      content: {
        headline: "The 30-Second Morning Habit Changing Health",
        bodyText:
          "Busy professionals are ditching complicated supplement stacks for one simple switch. PureVitals Daily Greens delivers 47 organic ingredients in a single morning scoop. Subscribe and save 30%.",
        thumbnailDescription:
          "Young professional adding green powder to a glass of water at kitchen counter, morning light, clean and minimal aesthetic",
      },
    },
  ];

  for (const v of taboolaVariations) {
    await prisma.variation.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        creativeSetId: creativeSetTaboola.id,
        platform: "taboola",
        content: v.content,
        isFavorite: v.isFavorite,
        label: v.label,
        position: v.position,
      },
    });
  }
  console.log(`✅ Taboola variations: ${taboolaVariations.length}`);

  console.log("\n🎉 Seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Login credentials:");
  console.log("  Email:    demo@adforge.ai");
  console.log("  Password: password123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
