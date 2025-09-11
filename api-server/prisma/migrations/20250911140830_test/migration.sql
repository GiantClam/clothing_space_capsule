-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mac_address" TEXT NOT NULL,
    "device_name" TEXT,
    "distribution_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "open_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "nickname" TEXT,
    "avatar" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clothes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL,
    "youzan_product_id" TEXT,
    "youzan_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "clothes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "runninghub_task_id" TEXT,
    "user_photo_url" TEXT,
    "user_photo_filename" TEXT,
    "top_clothes_id" TEXT,
    "bottom_clothes_id" TEXT,
    "top_clothes_filename" TEXT,
    "bottom_clothes_filename" TEXT,
    "result_url" TEXT,
    "distribution_url" TEXT,
    "error_message" TEXT,
    "workflow_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_top_clothes_id_fkey" FOREIGN KEY ("top_clothes_id") REFERENCES "clothes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_bottom_clothes_id_fkey" FOREIGN KEY ("bottom_clothes_id") REFERENCES "clothes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wechat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wechat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_mac_address_key" ON "devices"("mac_address");

-- CreateIndex
CREATE UNIQUE INDEX "users_open_id_key" ON "users"("open_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_parent_id_key" ON "categories"("name", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "clothes_name_category_id_key" ON "clothes"("name", "category_id");
