import 'dotenv/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const SECRET_KEY = process.env.AWS_SECRET_KEY;
const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET;
export class S3 {
  private static s3: S3Client;

  static {
    this.s3 = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
      },
    });
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
