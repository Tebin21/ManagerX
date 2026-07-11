import { ScreenshotCarousel } from "./ScreenshotCarousel";

export function PhoneMockup() {
  return (
    <div className="relative w-[190px] md:w-[220px] lg:w-[260px]">
      {/* Side buttons */}
      <span className="absolute -left-[2px] top-[84px] h-7 w-[2px] rounded-l-sm bg-ink/90" />
      <span className="absolute -left-[2px] top-[124px] h-12 w-[2px] rounded-l-sm bg-ink/90" />
      <span className="absolute -right-[2px] top-[114px] h-16 w-[2px] rounded-r-sm bg-ink/90" />

      <div className="rounded-[2.4rem] border-[4px] border-ink bg-ink p-0.5 shadow-2xl shadow-black/30 md:rounded-[2.6rem] md:border-[5px]">
        <div className="relative aspect-[643/1280] overflow-hidden rounded-[2.15rem] bg-white md:rounded-[2.3rem]">
          <ScreenshotCarousel startIndex={0} priority className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
