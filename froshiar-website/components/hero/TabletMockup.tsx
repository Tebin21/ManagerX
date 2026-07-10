import { ScreenshotCarousel } from "./ScreenshotCarousel";

export function TabletMockup() {
  return (
    <div className="relative w-[210px] sm:w-[270px] md:w-[310px] lg:w-[360px]">
      {/* Side button */}
      <span className="absolute -right-[2px] top-[64px] h-10 w-[2px] rounded-r-sm bg-ink-fixed/90 sm:top-[80px] sm:h-12" />

      <div className="rounded-[1.6rem] border-[7px] border-ink-fixed bg-ink-fixed p-1 shadow-2xl shadow-black/30 sm:rounded-[1.9rem] sm:border-[9px]">
        <div className="relative aspect-[643/1280] overflow-hidden rounded-[1rem] bg-white sm:rounded-[1.2rem] dark:bg-[#1c1810]">
          <ScreenshotCarousel
            startIndex={2}
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 270px, 210px"
            className="h-full w-full"
          />
          {/* Camera */}
          <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/40 ring-1 ring-white/20 sm:h-2 sm:w-2" />
        </div>
      </div>
    </div>
  );
}
