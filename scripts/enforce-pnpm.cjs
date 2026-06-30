"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

for (const file of ["package-lock.json", "yarn.lock"]) {
  try {
    fs.unlinkSync(path.join(root, file));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

const ua = process.env.npm_config_user_agent || "";
if (!ua.includes("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
