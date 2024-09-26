import { imageSize } from 'image-size';

/**
 * Read image dimensions from buffer
 */
export async function readImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const dimensions = imageSize(buffer);
  return {
    width: dimensions.width,
    height: dimensions.height,
  };
}