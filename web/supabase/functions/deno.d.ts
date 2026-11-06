// Ambient type declarations for Supabase Edge Functions (Deno runtime)
declare namespace Deno {
  export interface ServeOptions {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onListen?: (params: { hostname: string; port: number }) => void;
  }
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: ServeOptions
  ): void;
  export function serve(
    options: ServeOptions,
    handler: (req: Request) => Response | Promise<Response>
  ): void;

  export namespace env {
    export function get(key: string): string | undefined;
    export function set(key: string, value: string): void;
    export function has(key: string): boolean;
    export function toObject(): Record<string, string>;
  }
}

declare module "https://*";
declare module "npm:*";
declare module "jsr:*";
