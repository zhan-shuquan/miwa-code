// SOURCE intake contract shared by human upload and optional GPT recognition.
// Original images are never classified as finished listing media.
export const SOURCE_IMAGE_PURPOSE = "product_recognition_reference";
export const SOURCE_IMAGE_ROLE = "source_reference_image";
export const MAX_SOURCE_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_SOURCE_IMAGES_PER_PRODUCT = 8;
export const ALLOWED_IMAGE_MIMES = Object.freeze({
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"
});

function failure(message) {
  return Object.assign(new Error(message), { code: "invalid_source_image", statusCode: 400 });
}
export function decodeSourceImage({ mimeType, base64, name } = {}) {
  const mime=String(mimeType||"").toLowerCase().trim();
  const encoded=String(base64||"");
  const ext=ALLOWED_IMAGE_MIMES[mime];
  if(!ext || !encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw failure("原始图片只支持 JPG、PNG 或 WebP。");
  const buffer=Buffer.from(encoded,"base64");
  const hasSignature=mime==="image/jpeg"
    ? buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff
    : mime==="image/png"
      ? buffer.subarray(0,8).equals(Buffer.from("89504e470d0a1a0a","hex"))
      : buffer.subarray(0,4).toString()==="RIFF"&&buffer.subarray(8,12).toString()==="WEBP";
  if(!hasSignature || buffer.length<16 || buffer.length>MAX_SOURCE_IMAGE_BYTES)
    throw failure("原始图片内容无效或超过 2MB；请上传原文件，不会自动改动图片内容。");
  const originalName=String(name||"original."+ext).replace(/[\r\n\t/\\]/g,"_").slice(0,180)||"original."+ext;
  return { buffer,mimeType:mime,extension:ext,originalName };
}
export function isOriginalSourceImage(asset) {
  return asset?.metadata?.layer==="SOURCE" ||
    asset?.metadata?.imagePurpose===SOURCE_IMAGE_PURPOSE ||
    asset?.asset_role===SOURCE_IMAGE_ROLE;
}
export function isListingReadyImage(asset) {
  return Boolean(asset && asset.asset_type==="image" && !asset.archived_at &&
    !isOriginalSourceImage(asset));
}
