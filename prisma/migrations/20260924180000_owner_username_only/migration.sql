-- Keep the user row and its financial history while removing the unused email field.
DROP INDEX IF EXISTS "User_email_key";
ALTER TABLE "User" DROP COLUMN "email";
