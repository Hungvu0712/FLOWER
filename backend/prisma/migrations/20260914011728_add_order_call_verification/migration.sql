-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "call_confirmed_at" TIMESTAMP(3),
ADD COLUMN     "last_call_at" TIMESTAMP(3),
ADD COLUMN     "last_call_note" TEXT;

