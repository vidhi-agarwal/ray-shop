// Small stroke icons, drawn on a 24px grid so they sit on the text baseline at 16 to 20px.
type P = { size?: number; className?: string };

function svg(path: JSX.Element, { size = 18, className }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {path}
    </svg>
  );
}

export const IconChat = (p: P) => svg(<><path d="M4 19.5l1.3-3.9A8 8 0 1 1 8.5 19z" /><path d="M9 10.5h6M9 13.5h4" /></>, p);
export const IconOrders = (p: P) => svg(<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></>, p);
export const IconGrowth = (p: P) => svg(<><path d="M4 20h16" /><path d="M7 16v-4M12 16V8M17 16v-7" /><path d="M5 9l5-4 4 3 5-4" /></>, p);
export const IconRestart = (p: P) => svg(<><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v4h4" /></>, p);
export const IconCheck = (p: P) => svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, p);
export const IconPlay = (p: P) => svg(<path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" />, p);
export const IconShield = (p: P) => svg(<><path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" /><path d="M9 12l2 2 4-4" /></>, p);
export const IconBolt = (p: P) => svg(<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />, p);
export const IconCamera = (p: P) => svg(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>, p);
export const IconForward = (p: P) => svg(<><path d="M14 5l6 6-6 6" /><path d="M20 11H10a6 6 0 0 0-6 6v2" /></>, p);
export const IconClock = (p: P) => svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, p);
export const IconSend = (p: P) => svg(<path d="M4 20l17-8L4 4l2.5 8zM6.5 12H13" />, p);
export const IconLock = (p: P) => svg(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>, p);
export const IconExternal = (p: P) => svg(<><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5H5V6h5" /></>, p);
export const IconClose = (p: P) => svg(<path d="M6 6l12 12M18 6L6 18" />, p);
export const IconBack = (p: P) => svg(<path d="M15 5l-7 7 7 7" />, p);
export const IconCard = (p: P) => svg(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10.5h18" /></>, p);
export const IconBank = (p: P) => svg(<><path d="M3 9.5L12 4l9 5.5" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></>, p);
export const IconWallet = (p: P) => svg(<><path d="M4 7h14a2 2 0 0 1 2 2v9H6a2 2 0 0 1-2-2z" /><path d="M4 7l11-3v3" /><circle cx="16" cy="13" r="1" fill="currentColor" /></>, p);
export const IconWarn = (p: P) => svg(<><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>, p);

// RAY Shop mark: a forward slash in a rounded square, nodding to Razorpay's slanted R without copying it.
export function RayMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#305EFF" />
      <path d="M17.5 6.5L9 25.5h4.6l8.5-19z" fill="#fff" />
      <path d="M21.4 15.2l-3.6 10.3h4.4l2.6-7.5z" fill="#9DB4FF" />
    </svg>
  );
}
