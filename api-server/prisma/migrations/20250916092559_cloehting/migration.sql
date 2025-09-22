/*
  Warnings:

  - You are about to drop the column `youzan_product_id` on the `clothes` table. All the data in the column will be lost.
  - You are about to drop the column `youzan_url` on the `clothes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."clothes" DROP COLUMN "youzan_product_id",
DROP COLUMN "youzan_url",
ADD COLUMN     "purchase_url" TEXT;
