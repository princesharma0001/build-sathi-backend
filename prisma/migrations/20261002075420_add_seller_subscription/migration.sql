/*
  Warnings:

  - You are about to drop the `Otp` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "QuotaSource" AS ENUM ('FREE', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('PURCHASE', 'ADMIN_GRANT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "quotaSource" "QuotaSource" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "subscriptionId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freeQuotesUsed" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Otp";

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "quotationLimit" INTEGER NOT NULL,
    "validityDays" INTEGER,
    "hasTrustedBadge" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerSubscription" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "quotationsTotal" INTEGER NOT NULL,
    "quotationsRemaining" INTEGER NOT NULL,
    "hasTrustedBadge" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "SubscriptionSource" NOT NULL DEFAULT 'PURCHASE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "quotationLimit" INTEGER NOT NULL,
    "validityDays" INTEGER,
    "hasTrustedBadge" BOOLEAN NOT NULL DEFAULT false,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "paymentSessionId" TEXT,
    "cfOrderId" TEXT,
    "cfPaymentId" TEXT,
    "paymentMethod" TEXT,
    "paidAt" TIMESTAMP(3),
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_idx" ON "SubscriptionPlan"("isActive");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_sortOrder_idx" ON "SubscriptionPlan"("sortOrder");

-- CreateIndex
CREATE INDEX "SellerSubscription_sellerId_idx" ON "SellerSubscription"("sellerId");

-- CreateIndex
CREATE INDEX "SellerSubscription_planId_idx" ON "SellerSubscription"("planId");

-- CreateIndex
CREATE INDEX "SellerSubscription_status_idx" ON "SellerSubscription"("status");

-- CreateIndex
CREATE INDEX "SellerSubscription_expiresAt_idx" ON "SellerSubscription"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionOrder_orderId_key" ON "SubscriptionOrder"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionOrder_subscriptionId_key" ON "SubscriptionOrder"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionOrder_sellerId_idx" ON "SubscriptionOrder"("sellerId");

-- CreateIndex
CREATE INDEX "SubscriptionOrder_status_idx" ON "SubscriptionOrder"("status");

-- CreateIndex
CREATE INDEX "Quote_subscriptionId_idx" ON "Quote"("subscriptionId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SellerSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerSubscription" ADD CONSTRAINT "SellerSubscription_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerSubscription" ADD CONSTRAINT "SellerSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "SubscriptionOrder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "SubscriptionOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "SubscriptionOrder_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SellerSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
