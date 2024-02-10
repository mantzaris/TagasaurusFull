declare interface TaggingEntry {
  fileName: string;
  fileHash: string;
  fileType: string;
  taggingRawDescription: string;
  taggingTags: string[];
  taggingEmotions: Record<string, string>;
  taggingMemeChoices: string[];
  faceDescriptors: number[][];
  faceClusters: number[];
}
