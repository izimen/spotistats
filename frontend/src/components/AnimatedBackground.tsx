/**
 * Static Background - Performance optimized
 * No animations, just gradient overlays
 */

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Main gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

      {/* Static glow spots - no animations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/[0.08] rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
    </div>
  );
};

export default AnimatedBackground;
