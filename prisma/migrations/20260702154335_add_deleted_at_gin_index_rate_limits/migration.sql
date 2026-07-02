-- DropIndex
DROP INDEX "variations_creative_set_id_is_favorite_idx";

-- AlterTable
ALTER TABLE "variations" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_key_key" ON "rate_limits"("key");

-- CreateIndex
CREATE INDEX "variations_content_idx" ON "variations" USING GIN ("content");

-- CreateIndex (partial index — Prisma's schema DSL has no partial-index syntax, hand-written here)
CREATE INDEX "idx_variations_favorites" ON "variations"("creative_set_id", "is_favorite") WHERE "is_favorite" = TRUE;
