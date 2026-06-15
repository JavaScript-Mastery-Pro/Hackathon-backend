/*
  Warnings:

  - The values [PROCESSING,COMPLETED,FAILED] on the enum `SubmissionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `emailVerified` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `password` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubmissionStatus_new" AS ENUM ('UNDER_REVIEW', 'ACCEPTED', 'REJECTED');
ALTER TABLE "public"."submission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "submission" ALTER COLUMN "status" TYPE "SubmissionStatus_new" USING ("status"::text::"SubmissionStatus_new");
ALTER TYPE "SubmissionStatus" RENAME TO "SubmissionStatus_old";
ALTER TYPE "SubmissionStatus_new" RENAME TO "SubmissionStatus";
DROP TYPE "public"."SubmissionStatus_old";
ALTER TABLE "submission" ALTER COLUMN "status" SET DEFAULT 'UNDER_REVIEW';
COMMIT;

-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_userId_fkey";

-- DropForeignKey
ALTER TABLE "session" DROP CONSTRAINT "session_userId_fkey";

-- AlterTable
ALTER TABLE "submission" ALTER COLUMN "status" SET DEFAULT 'UNDER_REVIEW';

-- AlterTable
ALTER TABLE "user" DROP COLUMN "emailVerified",
ADD COLUMN     "password" TEXT NOT NULL;

-- DropTable
DROP TABLE "account";

-- DropTable
DROP TABLE "session";

-- DropTable
DROP TABLE "verification";
