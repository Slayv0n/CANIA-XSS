export const GlowSpot = ({ className }) => (
  <div className={`absolute pointer-events-none ${className}`}>
    <svg width="100%" height="100%" viewBox="0 0 1522 1058" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <g filter="url(#filter_glow)" className="opacity-70 light:opacity-100">
        <ellipse cx="761" cy="529" rx="361" ry="129" fill="var(--color-glow-spot)"/>
      </g>
      <defs>
        <filter id="filter_glow" x="0" y="0" width="1522" height="1058" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="200" result="effect1_foregroundBlur"/>
        </filter>
      </defs>
    </svg>
  </div>
);