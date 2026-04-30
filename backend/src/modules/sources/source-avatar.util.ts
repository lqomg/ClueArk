import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME: Record<string, 'jpg' | 'png' | 'webp' | 'gif'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function avatarExtForMime(mimetype: string): 'jpg' | 'png' | 'webp' | 'gif' | null {
  return ALLOWED_MIME[mimetype] ?? null;
}

/** 仅允许当前用户目录下的上传路径，防止写入任意外链或他人文件路径 */
export function assertSourceAvatarUrlOwned(userId: string, avatarUrl: string | null | undefined): void {
  if (avatarUrl == null || avatarUrl === '') return;
  if (avatarUrl.length > 512 || avatarUrl.includes('..')) {
    throw new BadRequestException('invalid_avatar_url');
  }
  const prefix = `/api/uploads/source-avatars/${userId}-`;
  if (!avatarUrl.startsWith(prefix)) {
    throw new BadRequestException('invalid_avatar_url');
  }
}
