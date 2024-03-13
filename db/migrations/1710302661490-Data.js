module.exports = class Data1710302661490 {
    name = 'Data1710302661490'

    async up(db) {
        await db.query(`CREATE TABLE "account" ("id" character varying NOT NULL, "wallet" text NOT NULL, "token" text NOT NULL, "balance" numeric NOT NULL, "average_balance" numeric NOT NULL, "updated_at" numeric NOT NULL, CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_88b7476f4b8bbcec8defcaffbe" ON "account" ("wallet") `)
        await db.query(`CREATE INDEX "IDX_8770e2748b77098c167c385540" ON "account" ("token") `)
    }

    async down(db) {
        await db.query(`DROP TABLE "account"`)
        await db.query(`DROP INDEX "public"."IDX_88b7476f4b8bbcec8defcaffbe"`)
        await db.query(`DROP INDEX "public"."IDX_8770e2748b77098c167c385540"`)
    }
}
