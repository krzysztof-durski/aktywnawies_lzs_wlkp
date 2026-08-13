/// <reference path="../worker-configuration.d.ts" />

declare namespace App {
  interface Locals {
    admin?: {
      id: number;
      username: string;
      role: "admin" | "superadmin";
    };
    csrfToken?: string;
  }
}
