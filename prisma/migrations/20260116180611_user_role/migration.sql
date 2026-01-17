-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('PARTICIPANT', 'ADMIN');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "user_role" NOT NULL DEFAULT 'PARTICIPANT';
