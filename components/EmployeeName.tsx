'use client';

import { useEmployeeShop } from '@/contexts/EmployeeShopContext';

interface Props {
  employeeId?: string | null;
  name: string;
  /**
   * Tailwind class(es) for the normal (non-promoted) color. The component falls
   * back to plain inherited color if this is omitted.
   */
  fallbackClassName?: string;
  className?: string;
}

/**
 * Renders an employee name. If the employee has bought the Promotion Certificate,
 * the name turns bright yellow site-wide.
 */
export default function EmployeeName({ employeeId, name, fallbackClassName, className }: Props) {
  const { hasActivePromotion } = useEmployeeShop();
  const promoted = employeeId ? hasActivePromotion(employeeId) : false;

  if (promoted) {
    return (
      <span
        className={`font-black text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.6)] ${className || ''}`}
      >
        {name}
      </span>
    );
  }

  return <span className={`${fallbackClassName || ''} ${className || ''}`}>{name}</span>;
}
