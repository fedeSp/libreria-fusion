-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('RETIRO_LOCAL', 'ENVIO_DOMICILIO');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'RETIRO_LOCAL',
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "shippingCity" TEXT,
ADD COLUMN     "shippingPostalCode" TEXT;
