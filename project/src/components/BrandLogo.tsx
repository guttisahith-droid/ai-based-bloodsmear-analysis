interface BrandLogoProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function BrandLogo({ orientation = 'horizontal', className = '' }: BrandLogoProps) {
  const isVertical = orientation === 'vertical';
  const containerClasses = isVertical
    ? `flex flex-col items-center text-center gap-3 ${className}`
    : `flex items-center gap-3 ${className}`;

  return (
    <div className={containerClasses}>
      <div className="bg-white p-1 rounded-full shadow">
        <img
          src="/college-emblem.jpg"
          alt="College emblem"
          className="w-14 h-14 object-contain rounded-full"
          loading="lazy"
        />
      </div>
      <div className={`${isVertical ? 'text-center' : 'text-left'} leading-tight`}>
        <p className="text-sm font-semibold uppercase text-gray-900">
          Velagapudi Ramakrishna Siddhartha Engineering College
        </p>
        <p className="text-xs text-gray-600">Siddhartha Academy of Higher Education</p>
      </div>
    </div>
  );
}

