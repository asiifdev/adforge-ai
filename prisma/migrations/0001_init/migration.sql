-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'generated', 'archived');

-- CreateEnum
CREATE TYPE "CampaignGoal" AS ENUM ('conversions', 'clicks', 'awareness');

-- CreateEnum
CREATE TYPE "CampaignTone" AS ENUM ('aggressive', 'professional', 'casual');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('google', 'meta', 'tiktok', 'taboola');

-- CreateEnum
CREATE TYPE "VariationLabel" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "GenerationLogStatus" AS ENUM ('success', 'error', 'partial');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "briefs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "landing_url" TEXT,
    "target_audience" TEXT NOT NULL,
    "goal" "CampaignGoal" NOT NULL,
    "tone" "CampaignTone" NOT NULL,
    "budget_range" TEXT,
    "platforms" "Platform"[],
    "variations_per_platform" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_sets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "brief_id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variations" (
    "id" TEXT NOT NULL,
    "creative_set_id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "content" JSONB NOT NULL,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "label" "VariationLabel",
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_logs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "model_used" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "tokens_used" INTEGER,
    "duration_ms" INTEGER,
    "status" "GenerationLogStatus" NOT NULL,
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");

-- CreateIndex
CREATE INDEX "projects_user_id_status_idx" ON "projects"("user_id", "status");

-- CreateIndex
CREATE INDEX "projects_user_id_updated_at_idx" ON "projects"("user_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "briefs_project_id_key" ON "briefs"("project_id");

-- CreateIndex
CREATE INDEX "briefs_project_id_idx" ON "briefs"("project_id");

-- CreateIndex
CREATE INDEX "creative_sets_project_id_idx" ON "creative_sets"("project_id");

-- CreateIndex
CREATE INDEX "creative_sets_project_id_platform_idx" ON "creative_sets"("project_id", "platform");

-- CreateIndex
CREATE INDEX "variations_creative_set_id_idx" ON "variations"("creative_set_id");

-- CreateIndex
CREATE INDEX "variations_creative_set_id_platform_idx" ON "variations"("creative_set_id", "platform");

-- CreateIndex
CREATE INDEX "variations_creative_set_id_is_favorite_idx" ON "variations"("creative_set_id", "is_favorite");

-- CreateIndex
CREATE INDEX "generation_logs_project_id_idx" ON "generation_logs"("project_id");

-- CreateIndex
CREATE INDEX "generation_logs_created_at_idx" ON "generation_logs"("created_at");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_sets" ADD CONSTRAINT "creative_sets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_sets" ADD CONSTRAINT "creative_sets_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variations" ADD CONSTRAINT "variations_creative_set_id_fkey" FOREIGN KEY ("creative_set_id") REFERENCES "creative_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
