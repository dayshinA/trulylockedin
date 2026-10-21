"use client";

// next-cloudinary ships without a "use client" directive, and its components
// use hooks, so Server Components import them through this boundary.
export { CldImage } from "next-cloudinary";
