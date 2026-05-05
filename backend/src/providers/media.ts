import crypto from "node:crypto";

import { env } from "../config/env.js";

export interface MediaProvider {
  signImageUpload(publicId: string): Promise<{
    cloudName: string | null;
    apiKey: string | null;
    timestamp: number;
    signature: string | null;
    publicId: string;
  }>;
}

class MockMediaProvider implements MediaProvider {
  async signImageUpload(publicId: string) {
    return {
      cloudName: null,
      apiKey: null,
      timestamp: Date.now(),
      signature: null,
      publicId
    };
  }
}

class CloudinaryMediaProvider implements MediaProvider {
  async signImageUpload(publicId: string) {
    if (!env.CLOUDINARY_API_SECRET || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_CLOUD_NAME) {
      throw new Error("Cloudinary credentials are missing.");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHash("sha1")
      .update(`public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`)
      .digest("hex");

    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      publicId
    };
  }
}

export const mediaProvider: MediaProvider =
  env.MEDIA_PROVIDER_MODE === "cloudinary" ? new CloudinaryMediaProvider() : new MockMediaProvider();
