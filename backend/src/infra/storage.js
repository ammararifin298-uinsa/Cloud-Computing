import fs from "node:fs/promises";
import path from "node:path";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { config } from "../core/config.js";

/**
 * Dependency Inversion: StorageBackend implementations (MinIO S3 & Local FS).
 */
export class MinIOStorageBackend {
  constructor() {
    this.name = "minio";
    this.bucket = config.minioBucket;
    this.ready = false;
    this.client = new S3Client({
      region: "us-east-1",
      endpoint: config.minioEndpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.minioAccessKey,
        secretAccessKey: config.minioSecretKey,
      },
    });
  }

  async ensureReady() {
    if (this.ready) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };
    await this.client.send(
      new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: JSON.stringify(policy) })
    );
    this.ready = true;
  }

  async put(key, buffer, contentType) {
    await this.ensureReady();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  }

  async listObjects(excludePrefix = "avatar_") {
    await this.ensureReady();
    const res = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket }));
    return (res.Contents || [])
      .filter((o) => !excludePrefix || !o.Key.startsWith(excludePrefix))
      .map((o) => ({
        key: o.Key,
        size_bytes: Number(o.Size || 0),
        last_modified: o.LastModified ? o.LastModified.toISOString() : null,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  async exists(key) {
    await this.ensureReady();
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key) {
    await this.ensureReady();
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export class LocalStorageBackend {
  constructor(baseDir = config.uploadsDir) {
    this.name = "local";
    this.dir = baseDir;
  }

  async ensureReady() {
    await fs.mkdir(this.dir, { recursive: true });
  }

  async put(key, buffer) {
    await this.ensureReady();
    await fs.writeFile(path.join(this.dir, key), buffer);
  }

  async listObjects(excludePrefix = "avatar_") {
    await this.ensureReady();
    const names = await fs.readdir(this.dir);
    const items = [];
    for (const name of names) {
      if (excludePrefix && name.startsWith(excludePrefix)) continue;
      const st = await fs.stat(path.join(this.dir, name));
      if (st.isFile()) {
        items.push({
          key: name,
          size_bytes: st.size,
          last_modified: st.mtime.toISOString(),
        });
      }
    }
    return items.sort((a, b) => a.key.localeCompare(b.key));
  }

  async exists(key) {
    try {
      const st = await fs.stat(path.join(this.dir, key));
      return st.isFile();
    } catch {
      return false;
    }
  }

  async delete(key) {
    await fs.rm(path.join(this.dir, key), { force: true });
  }
}

let storageInstance = null;
export function getStorage() {
  if (!storageInstance) {
    storageInstance =
      config.storageBackend === "local" ? new LocalStorageBackend() : new MinIOStorageBackend();
  }
  return storageInstance;
}
