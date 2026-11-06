-- Owners now sign in with mobile + name + password; email becomes optional.
ALTER TABLE "Owner" ADD COLUMN     "phoneKey" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX "Owner_phoneKey_key" ON "Owner"("phoneKey");

-- Fill phoneKey (last 10 digits) from the mobile already saved in Settings, but only where that number
-- belongs to exactly one owner and to no caretaker. Anyone left out is asked for their mobile.
WITH keys AS (
  SELECT "id", right(regexp_replace("phone", '\D', '', 'g'), 10) AS k
  FROM "Owner"
  WHERE "phone" IS NOT NULL AND length(regexp_replace("phone", '\D', '', 'g')) >= 10
),
uniq AS (
  SELECT k FROM keys GROUP BY k HAVING count(*) = 1
)
UPDATE "Owner" o
SET "phoneKey" = keys.k
FROM keys
WHERE o."id" = keys."id"
  AND keys.k IN (SELECT k FROM uniq)
  AND NOT EXISTS (SELECT 1 FROM "Staff" s WHERE s."phone" = keys.k);
