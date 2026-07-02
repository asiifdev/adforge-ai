-- CreateEnum
CREATE TYPE "CampaignLanguage" AS ENUM ('english', 'indonesian');

-- AlterTable
ALTER TABLE "briefs" ADD COLUMN     "language" "CampaignLanguage" NOT NULL DEFAULT 'english';
