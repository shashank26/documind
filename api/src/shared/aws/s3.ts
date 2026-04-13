import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Config } from '../../config';

const { REGION, ACCESS_KEY, SECRET_KEY, BUCKET, DEBUG } = Config;

export class S3 {
  private static s3: S3Client;

  static {
    if (DEBUG) {
      this.s3 = new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: ACCESS_KEY,
          secretAccessKey: SECRET_KEY,
        },
      });
    } else {
      this.s3 = new S3Client({
        region: REGION,
      });
    }
  }

  static async upload(buffer: Buffer, fileName: string) {
    const key = `documents/${Date.now()}-${fileName}`;
    // TODO: Support for huge files
    await this.s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
      }),
    );

    return key;
  }

  static async download(fileUrl: string) {
    try {
      const res = await this.s3.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: fileUrl,
        }),
      );

      const stream = res.Body as any;

      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
