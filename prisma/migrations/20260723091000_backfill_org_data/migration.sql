-- Backfill Organization records for clusters missing them
INSERT INTO "organization" (id, name, slug, "createdAt")
SELECT c.id, c.name, c.id, c."createdAt"
FROM "Cluster" c
LEFT JOIN "organization" o ON o.id = c.id
WHERE o.id IS NULL;

-- Backfill Member records for cluster members missing them
-- First-joined member per cluster gets 'owner', others get 'member'
WITH ranked_members AS (
  SELECT
    cm."clusterId",
    cm."userId",
    cm."joinedAt",
    ROW_NUMBER() OVER (PARTITION BY cm."clusterId" ORDER BY cm."joinedAt" ASC) AS rn
  FROM "ClusterMember" cm
  LEFT JOIN "member" m ON m."organizationId" = cm."clusterId" AND m."userId" = cm."userId"
  WHERE m.id IS NULL
)
INSERT INTO "member" (id, "organizationId", "userId", role, "createdAt")
SELECT
  CONCAT("clusterId", '-', "userId"),
  "clusterId",
  "userId",
  CASE WHEN rn = 1 THEN 'owner' ELSE 'member' END,
  "joinedAt"
FROM ranked_members;
