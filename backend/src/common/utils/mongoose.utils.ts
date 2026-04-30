import { Document } from 'mongoose';

/**
 * 将 Mongoose Document 转换为普通对象
 * @param doc Mongoose Document 或普通对象
 * @returns 普通 JavaScript 对象
 */
export function toPlainObject<T>(doc: T | (Document & T)): T & {_id: string} {
  if (!doc) {
    return doc as T & {_id: string};
  }
  
  // 检查是否是 Mongoose Document
  if (typeof (doc as any).toObject === 'function') {
    return (doc as any).toObject() as T & {_id: string};
  }
  
  return doc as T & {_id: string};
}

/**
 * 将 Mongoose Document 转换为普通对象并排除指定字段
 * @param doc Mongoose Document 或普通对象
 * @param excludeFields 要排除的字段名数组
 * @returns 排除指定字段后的普通对象
 */
export function toPlainObjectWithoutFields<T extends Record<string, any>>(
  doc: T | (Document & T),
  excludeFields: (keyof T)[],
): Partial<T> {
  const plainObject = toPlainObject(doc);
  
  const result: any = { ...plainObject };
  excludeFields.forEach(field => {
    delete result[field];
  });
  
  return result;
}
