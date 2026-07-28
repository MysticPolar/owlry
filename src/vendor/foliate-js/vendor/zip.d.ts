export interface ZipEntry {
  filename: string;
  encrypted?: boolean;
  compressionMethod?: number;
  getData(
    writer: TextWriter,
    options?: { useWebWorkers?: boolean },
  ): Promise<string>;
}

export class BlobReader {
  constructor(blob: Blob);
}

export class TextWriter {
  constructor(encoding?: string);
}

export class ZipReader {
  constructor(reader: BlobReader);
  getEntries(): Promise<ZipEntry[]>;
  close(): Promise<void>;
}
