/// <reference path="../worker-configuration.d.ts" />
import type { Runtime } from "@astrojs/cloudflare";

declare namespace App {
  interface Locals extends Runtime<Env> {
    admin?: {
      id: number;
      username: string;
      role: "admin" | "superadmin";
    };
    csrfToken?: string;
  }
}
