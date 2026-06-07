"use client";

type AppLogoProps = {
  size?: number;
  withText?: boolean;
  subtitle?: boolean;
};

export default function AppLogo({
  size = 72,
  withText = false,
  subtitle = false,
}: AppLogoProps) {
  return (
    <div
      className={`flex items-center gap-4 ${
        withText ? "justify-start" : "justify-center"
      }`}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-[26px] border border-white/10 bg-white text-black shadow-2xl shadow-black/30"
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,1),rgba(245,245,245,0.92)_45%,rgba(225,225,225,0.95)_100%)]" />

        <div className="absolute inset-[1px] rounded-[24px] border border-black/5 bg-gradient-to-br from-white via-white to-zinc-100" />

        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <svg
            viewBox="0 0 64 64"
            className="h-[58%] w-[58%]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 15V49"
              stroke="black"
              strokeWidth="5"
              strokeLinecap="round"
            />

            <path
              d="M18 17H34C40.0751 17 45 21.9249 45 28C45 34.0751 40.0751 39 34 39H18"
              stroke="black"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <path
              d="M29 43L35 49L48 35"
              stroke="black"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="pointer-events-none absolute inset-x-3 top-2 h-5 rounded-full bg-white/45 blur-md" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/5 to-transparent" />
      </div>

      {withText && (
        <div>
          <p className="text-xl font-black tracking-tight text-white">
            Planner Pro
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-white/40">
              Smart productivity
            </p>
          )}
        </div>
      )}
    </div>
  );
}