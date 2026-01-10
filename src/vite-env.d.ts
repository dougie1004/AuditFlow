/// <reference types="vite/client" />

interface ImportMetaEnv {
    // Add other VITE_ variables here
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module "*.png";
declare module "*.svg";
declare module "*.jpg";
declare module "*.jpeg";
