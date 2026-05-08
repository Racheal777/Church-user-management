-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('event', 'notice', 'vacancy', 'program');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'POST_ANNOUNCEMENT';

-- CreateTable
CREATE TABLE "Announcement" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL,
    "event_date" TIMESTAMP(3),
    "event_time" TEXT,
    "venue" TEXT,
    "posted_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "branch_id" UUID,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_category_idx" ON "Announcement"("category");

-- CreateIndex
CREATE INDEX "Announcement_branch_id_idx" ON "Announcement"("branch_id");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
