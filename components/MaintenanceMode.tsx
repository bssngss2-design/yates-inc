'use client';

// Set this to false to disable maintenance mode
const MAINTENANCE_MODE_ENABLED = false;

export default function MaintenanceMode({ children }: { children: React.ReactNode }) {
  if (!MAINTENANCE_MODE_ENABLED) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900 flex items-center justify-center">
      <div className="text-center p-8 max-w-2xl">
        {/* Big construction icon */}
        <div className="text-9xl mb-8 animate-bounce">
          🚧
        </div>
        
        {/* Main message */}
        <h1 className="text-5xl md:text-7xl font-black text-yellow-400 mb-6 animate-pulse">
          WORK IN PROGRESS
        </h1>
        
        {/* Sub message */}
        <p className="text-2xl md:text-3xl text-gray-300 mb-8">
          We&apos;re making some important updates to improve your experience.
        </p>
        
        {/* Additional info */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-yellow-500/30">
          <p className="text-lg text-gray-400 mb-4">
            The site is temporarily unavailable while we work on:
          </p>
          <ul className="text-left text-gray-300 space-y-2 mb-6">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Security improvements
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">⚡</span> New features
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">🔧</span> Bug fixes
            </li>
          </ul>
          <p className="text-sm text-gray-500">
            Check back soon! - Yates Co. Team
          </p>
        </div>
        
        {/* Animated dots */}
        <div className="mt-8 flex justify-center gap-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
