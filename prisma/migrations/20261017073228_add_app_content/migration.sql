-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('TERMS', 'PRIVACY', 'ABOUT');

-- CreateTable
CREATE TABLE "app_content" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_content_type_key" ON "app_content"("type");

-- CreateIndex
CREATE UNIQUE INDEX "app_content_slug_key" ON "app_content"("slug");

-- CreateIndex
CREATE INDEX "app_content_isPublished_idx" ON "app_content"("isPublished");
