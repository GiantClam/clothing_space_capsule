-- AlterTable
ALTER TABLE "clothes" ALTER COLUMN "detail_desc" DROP NOT NULL;

-- CreateTable
CREATE TABLE "wechat_qr_codes" (
    "id" TEXT NOT NULL,
    "scene_str" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "expire_time" TIMESTAMP(3) NOT NULL,
    "device_id" TEXT,
    "user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNUSED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wechat_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wechat_users" (
    "id" TEXT NOT NULL,
    "openid" TEXT NOT NULL,
    "device_id" TEXT,
    "subscribe" BOOLEAN NOT NULL DEFAULT false,
    "subscribe_time" TIMESTAMP(3),
    "unsubscribe_time" TIMESTAMP(3),
    "nickname" TEXT,
    "headimgurl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wechat_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wechat_qr_codes_scene_str_key" ON "wechat_qr_codes"("scene_str");

-- CreateIndex
CREATE UNIQUE INDEX "wechat_users_openid_key" ON "wechat_users"("openid");
