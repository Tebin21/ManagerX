import { ScreenshotCarousel } from "./ScreenshotCarousel";

export function PhoneMockup() {
  return (
    <div className="relative w-[150px] sm:w-[190px] md:w-[220px] lg:w-[260px]">
      {/* Side buttons */}
      <span className="absolute -left-[2px] top-[68px] h-6 w-[2px] rounded-l-sm bg-ink/90 sm:top-[84px] sm:h-7" />
      <span className="absolute -left-[2px] top-[100px] h-10 w-[2px] rounded-l-sm bg-ink/90 sm:top-[124px] sm:h-12" />
      <span className="absolute -right-[2px] top-[92px] h-14 w-[2px] rounded-r-sm bg-ink/90 sm:top-[114px] sm:h-16" />

      <div className="rounded-[2.4rem] border-[8px] border-ink bg-ink p-1 shadow-2xl shadow-black/30 sm:rounded-[2.6rem] sm:border-[10px]">
        <div className="relative aspect-[643/1280] overflow-hidden rounded-[1.9rem] bg-white sm:rounded-[2rem]">
          <ScreenshotCarousel startIndex={0} priority className="h-full w-full" />
          {/* Dynamic island */}
          <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-ink sm:h-5 sm:w-20" />
        </div>
      </div>
    </div>
  );
}
