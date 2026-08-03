"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface PostMediaProps {
  images?: string[] | null;
  fallbackUrl?: string | null;
}

export function PostMedia({ images, fallbackUrl }: PostMediaProps) {
  const [viewMode, setViewMode] = useState<"grid" | "carousel">("grid");
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Safe parse images if it's a string (MySQL JSON sometimes comes back as string)
  let parsedImages: string[] = [];
  try {
    if (Array.isArray(images)) {
      parsedImages = images;
    } else if (typeof images === "string") {
      parsedImages = JSON.parse(images);
    }
  } catch (e) {
    console.error("Error parsing images:", e);
  }

  // Combine new 'images' JSON and legacy 'fallbackUrl'
  const allImages = parsedImages.length > 0 ? parsedImages : (fallbackUrl ? [fallbackUrl] : []);

  if (allImages.length === 0) return null;

  const count = allImages.length;

  const next = () => setCarouselIndex((prev) => (prev + 1) % count);
  const prev = () => setCarouselIndex((prev) => (prev - 1 + count) % count);

  return (
    <div className="mb-6 overflow-hidden">
      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`grid gap-2 rounded-2xl overflow-hidden border border-hairline bg-surface relative group/media
                            ${
                              count === 1
                                ? "grid-cols-1 aspect-auto"
                                : count === 2
                                ? "grid-cols-2 aspect-[4/3]"
                                : count === 3
                                ? "grid-cols-3 aspect-[4/3]"
                                : "grid-cols-2 aspect-square"
                            }
                        `}
          >
            {count === 1 && (
              <div
                className="relative w-full h-full min-h-[300px] max-h-[600px] overflow-hidden cursor-pointer"
                onClick={() => {
                  setCarouselIndex(0);
                  setViewMode("carousel");
                }}
              >
                <Image
                  src={allImages[0]}
                  alt=""
                  width={1200}
                  height={800}
                  className="w-full h-auto object-contain transition-transform group-hover/media:scale-[1.01] duration-700"
                  unoptimized // User-uploaded images from Cloudinary/external might need this if no loader
                />
              </div>
            )}

            {count === 2 &&
              allImages.map((img, i) => (
                <div
                  key={i}
                  className="relative w-full h-full overflow-hidden cursor-pointer"
                  onClick={() => {
                    setCarouselIndex(i);
                    setViewMode("carousel");
                  }}
                >
                  <Image
                    src={img}
                    fill
                    alt=""
                    className="object-cover transition-transform group-hover/media:scale-[1.02] duration-700"
                    unoptimized
                    sizes="(max-width: 768px) 50vw, 400px"
                  />
                </div>
              ))}

            {count === 3 && (
              <>
                <div
                  className="relative col-span-2 row-span-2 overflow-hidden cursor-pointer"
                  onClick={() => {
                    setCarouselIndex(0);
                    setViewMode("carousel");
                  }}
                >
                  <Image
                    src={allImages[0]}
                    fill
                    alt=""
                    className="object-cover transition-transform group-hover/media:scale-[1.02] duration-700"
                    unoptimized
                    sizes="(max-width: 768px) 66vw, 600px"
                  />
                </div>
                <div className="grid grid-rows-2 gap-2">
                  <div
                    className="relative w-full h-full overflow-hidden cursor-pointer"
                    onClick={() => {
                      setCarouselIndex(1);
                      setViewMode("carousel");
                    }}
                  >
                    <Image
                      src={allImages[1]}
                      fill
                      alt=""
                      className="object-cover transition-transform group-hover/media:scale-[1.02] duration-700"
                      unoptimized
                      sizes="(max-width: 768px) 33vw, 300px"
                    />
                  </div>
                  <div
                    className="relative w-full h-full overflow-hidden cursor-pointer"
                    onClick={() => {
                      setCarouselIndex(2);
                      setViewMode("carousel");
                    }}
                  >
                    <Image
                      src={allImages[2]}
                      fill
                      alt=""
                      className="object-cover transition-transform group-hover/media:scale-[1.02] duration-700"
                      unoptimized
                      sizes="(max-width: 768px) 33vw, 300px"
                    />
                  </div>
                </div>
              </>
            )}

            {count >= 4 &&
              allImages.slice(0, 4).map((img, i) => (
                <div
                  key={i}
                  className="relative w-full h-full overflow-hidden cursor-pointer"
                  onClick={() => {
                    setCarouselIndex(i);
                    setViewMode("carousel");
                  }}
                >
                  <Image
                    src={img}
                    fill
                    alt=""
                    className="object-cover transition-transform group-hover/media:scale-[1.02] duration-700"
                    unoptimized
                    sizes="(max-width: 768px) 50vw, 400px"
                  />
                  {i === 3 && count > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-foreground backdrop-blur-[2px]">
                      <Plus className="w-8 h-8 mb-1" />
                      <span className="text-lg font-black uppercase tracking-widest">{count - 4} más</span>
                    </div>
                  )}
                </div>
              ))}
          </motion.div>
        ) : (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative bg-surface rounded-2xl overflow-hidden aspect-square flex flex-col items-center justify-center p-4 group/carousel border border-hairline"
          >
            {/* Back to Grid Button */}
            <button
              onClick={() => setViewMode("grid")}
              className="absolute top-4 left-4 z-20 px-4 py-2 bg-white/80 hover:bg-card text-muted-foreground rounded-xl backdrop-blur-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-hairline shadow-sm"
            >
              <ChevronLeft className="w-3 h-3" /> Volver
            </button>

            {/* Image Counter */}
            <div className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-white/80 backdrop-blur-md text-muted-foreground rounded-xl text-[10px] font-black uppercase tracking-widest border border-hairline shadow-sm">
              {carouselIndex + 1} / {count}
            </div>

            {/* Current Image */}
            <div className="relative w-full h-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={carouselIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  <Image src={allImages[carouselIndex]} alt="" fill className="object-contain" unoptimized />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Arrows */}
            {count > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-card text-muted-foreground rounded-full flex items-center justify-center backdrop-blur-md shadow-md transition-all z-20"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-card text-muted-foreground rounded-full flex items-center justify-center backdrop-blur-md shadow-md transition-all z-20"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
