-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SheetInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "SheetInvitation_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ExpenseSheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SheetInvitation" ("createdAt", "expiresAt", "id", "phone", "sheetId", "status", "token") SELECT "createdAt", "expiresAt", "id", "phone", "sheetId", "status", "token" FROM "SheetInvitation";
DROP TABLE "SheetInvitation";
ALTER TABLE "new_SheetInvitation" RENAME TO "SheetInvitation";
CREATE UNIQUE INDEX "SheetInvitation_token_key" ON "SheetInvitation"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
