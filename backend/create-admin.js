const crypto = require("crypto");
const pool = require("./db");

const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

async function createAdmin() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Set ADMIN_BOOTSTRAP_EMAIL to a valid email address.");
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
        throw new Error("Set ADMIN_BOOTSTRAP_PASSWORD to a password between 8 and 128 characters.");
    }

    const client = await pool.connect();
    let inTransaction = false;

    try {
        await client.query("BEGIN");
        inTransaction = true;

        const schema = await client.query(`
            SELECT
                to_regclass('public.users') IS NOT NULL AS users_table,
                to_regclass('public.admin_roles') IS NOT NULL AS admin_roles_table,
                to_regclass('public.admin_permissions') IS NOT NULL AS admin_permissions_table,
                to_regclass('public.admin_role_permissions') IS NOT NULL AS admin_role_permissions_table,
                EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'admin_role'
                ) AS admin_role_column
        `);
        if (Object.values(schema.rows[0]).some((exists) => !exists)) {
            throw new Error("Admin schema is missing. Apply database/migrations/001_transaction_integrity.sql first.");
        }

        const permissions = await client.query(`
            SELECT 1
            FROM admin_roles r
            JOIN admin_role_permissions rp ON rp.role_id = r.id
            JOIN admin_permissions p ON p.id = rp.permission_id
            WHERE r.slug = 'super_admin' AND p.slug = 'dashboard.read'
        `);
        if (!permissions.rowCount) {
            throw new Error("Admin permissions are not seeded. Apply database/migrations/001_transaction_integrity.sql first.");
        }

        const existing = await client.query("SELECT id FROM users WHERE LOWER(email) = $1 FOR UPDATE", [email]);
        if (existing.rowCount) {
            throw new Error("An account with this email already exists. No account was changed.");
        }

        const username = `admin_${email.split("@")[0].replace(/[^a-z0-9_]/g, "_").slice(0, 42)}`;
        const usernameExists = await client.query("SELECT 1 FROM users WHERE username = $1", [username]);
        if (usernameExists.rowCount) {
            throw new Error("The generated admin username is already in use. No account was created.");
        }

        const salt = crypto.randomBytes(16).toString("hex");
        const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
        await client.query(
            `INSERT INTO users (username, full_name, email, password_hash, role, admin_role, status)
             VALUES ($1, $2, $3, $4, 'admin', 'super_admin', 'active')`,
            [username, "AbbaKano Administrator", email, `${salt}:${passwordHash}`]
        );

        await client.query("COMMIT");
        inTransaction = false;
        console.log(`Admin account created for ${email}.`);
    } catch (error) {
        if (inTransaction) await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

createAdmin()
    .catch((error) => {
        console.error(error.message || "Admin account creation failed.");
        process.exitCode = 1;
    })
    .finally(() => pool.end());