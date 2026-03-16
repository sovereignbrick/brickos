export const IS_OSS = process.env.NEXT_PUBLIC_MODE === 'oss'
export const APP_NAME = IS_OSS ? 'Sovereign Health' : 'Sovereign Health Intelligence'
