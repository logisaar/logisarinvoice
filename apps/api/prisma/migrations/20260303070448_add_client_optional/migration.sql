-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_client_id_fkey";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "company" TEXT;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "client_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
