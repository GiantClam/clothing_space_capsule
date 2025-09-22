/*
  Warnings:

  - You are about to drop the column `prompt` on the `clothes` table. All the data in the column will be lost.
  - Added the required column `detail_desc` to the `clothes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."clothes" 
ADD COLUMN "detail_desc" TEXT,
ADD COLUMN "general_desc" TEXT;

-- 将原prompt列的数据复制到detail_desc列
UPDATE "public"."clothes" SET "detail_desc" = "prompt" WHERE "prompt" IS NOT NULL;

-- 删除原prompt列
ALTER TABLE "public"."clothes" DROP COLUMN "prompt";

-- 将detail_desc列设置为非空
ALTER TABLE "public"."clothes" ALTER COLUMN "detail_desc" SET NOT NULL;