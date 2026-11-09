declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MEDIA_UPLOAD_TOKEN?: string;
    MEDIA_UPLOAD_EXPIRES?: string;
  }
}
