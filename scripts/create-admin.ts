// One-off local tool: creates the SQL to insert the bootstrap admin_users row.
// There is no signup UI on purpose — you run this locally, review the printed
// command, then run it yourself against the real D1 database and email the
// credentials to the client out-of-band.
//
// This is meant for the one root account that bootstraps everything else —
// every admin account is equal (no elevated role), so any additional accounts
// after that should be created in-app at /admin/uzytkownicy by an existing
// admin, not via this script.
//
// Usage: npx tsx scripts/create-admin.ts <username>

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hashPassword, isPasswordStrongEnough, PASSWORD_REQUIREMENTS_LABEL } from "../src/lib/auth";

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Usage: npx tsx scripts/create-admin.ts <username>");
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const password = await rl.question(`Password for new admin (${PASSWORD_REQUIREMENTS_LABEL}, visible as typed): `);
  const confirm = await rl.question("Confirm password: ");
  rl.close();

  if (password !== confirm) {
    console.error("Passwords did not match.");
    process.exit(1);
  }
  if (!isPasswordStrongEnough(password)) {
    console.error(`Password does not meet requirements: ${PASSWORD_REQUIREMENTS_LABEL}.`);
    process.exit(1);
  }

  const { hash, salt } = await hashPassword(password);

  const sql = `INSERT INTO admin_users (username, password_hash, password_salt) VALUES ('${sqlEscape(
    username,
  )}', '${hash}', '${salt}');`;

  console.log("\nReview the SQL below, then run it yourself:\n");
  console.log(sql);
  console.log("\nLocal DB (for testing this build locally):");
  console.log(`  npx wrangler d1 execute igrzyska-lzs-2026 --local --command="${sql.replace(/"/g, '\\"')}"`);
  console.log("\nProduction DB (once the real database exists):");
  console.log(`  npx wrangler d1 execute igrzyska-lzs-2026 --remote --command="${sql.replace(/"/g, '\\"')}"`);
  console.log(
    "\nNo secret in this output is written to any file — copy the command, run it, then email the username/password to the client out-of-band.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
