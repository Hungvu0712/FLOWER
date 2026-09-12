-- CreateTable
CREATE TABLE "special_dates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "remind_days_before" INTEGER NOT NULL DEFAULT 3,
    "last_reminded_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "special_dates_user_id_idx" ON "special_dates"("user_id");

-- AddForeignKey
ALTER TABLE "special_dates" ADD CONSTRAINT "special_dates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
