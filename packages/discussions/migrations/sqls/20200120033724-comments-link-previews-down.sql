ALTER TABLE "comments"
  DROP COLUMN "urls",
  DROP COLUMN "embedUrl",
  DROP COLUMN IF EXISTS "mentioningRepoId",
  DROP COLUMN IF EXISTS "mentioningFragmentId"
;

ALTER TABLE "comments"
  RENAME COLUMN "reports" TO "reportedBy"
;

ALTER TABLE "discussions"
  DROP COLUMN IF EXISTS "isBoard"
;
