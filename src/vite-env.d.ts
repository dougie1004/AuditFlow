/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module "*.png";
declare module "*.svg";
declare module "*.jpg";
declare module "*.jpeg";
