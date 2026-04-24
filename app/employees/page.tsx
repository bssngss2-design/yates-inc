'use client';

import { employees as staticEmployees, firedEmployees as staticFired } from '@/utils/products';
import Image from 'next/image';
import EmployeeName from '@/components/EmployeeName';
import EmployeeOfTheMonthPlaque from '@/components/EmployeeOfTheMonthPlaque';
import TierBadge, { shouldShowRole } from '@/components/TierBadge';
import XpTierInfoPanel from '@/components/XpTierInfoPanel';
import { useAdmin } from '@/contexts/AdminContext';
import { useMemo } from 'react';

interface EmployeeCardData {
  id: string;
  name: string;
  role: string;
  bio?: string;
  images?: string[];
}

export default function EmployeesPage() {
  const { hired, fired } = useAdmin();

  // Merge static roster + dynamically hired, filter out anyone fired via admin bar.
  const { activeList, firedList } = useMemo(() => {
    const firedIdSet = new Set(fired.map((f) => f.employee_id));

    const staticActive: EmployeeCardData[] = staticEmployees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      bio: e.bio,
      images: 'images' in e && Array.isArray((e as any).images) ? (e as any).images : undefined,
    }));

    const hiredActive: EmployeeCardData[] = hired.map((h) => ({
      id: h.employee_id,
      name: h.name,
      role: h.role,
      bio: h.bio ?? undefined,
    }));

    const active = [...staticActive, ...hiredActive].filter((e) => !firedIdSet.has(e.id));

    // Fired: static fired roster + anyone fired via admin bar (dedup by id)
    const dynamicFired: EmployeeCardData[] = fired
      .map((f) => {
        // Try to enrich with name/role/bio from either static or hired
        const fromStatic = staticEmployees.find((e) => e.id === f.employee_id);
        const fromHired = hired.find((h) => h.employee_id === f.employee_id);
        return {
          id: f.employee_id,
          name: f.employee_name || fromStatic?.name || fromHired?.name || f.employee_id,
          role: fromStatic?.role || fromHired?.role || 'Former employee',
          bio: f.reason || fromStatic?.bio || fromHired?.bio || undefined,
        };
      });

    const staticFiredMapped: EmployeeCardData[] = staticFired.map((f) => ({
      id: f.id,
      name: f.name,
      role: f.role,
      bio: f.bio,
    }));

    const allFired = [...staticFiredMapped, ...dynamicFired];
    const seen = new Set<string>();
    const firedDedup = allFired.filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });

    return { activeList: active, firedList: firedDedup };
  }, [hired, fired]);

  return (
    <div className="min-h-screen py-8 sm:py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Left column: heading + XP / tier rewards info panel */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Our Team</h1>
            <XpTierInfoPanel className="mt-4 sm:mt-6" />
          </div>
          {/* Employee of the Month plaque — small, tucked top-right */}
          <div className="hidden sm:block shrink-0">
            <EmployeeOfTheMonthPlaque size="sm" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {activeList.map((employee) => (
            <div
              key={employee.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 scroll-mt-20 hover:shadow-lg transition-shadow"
            >
              {employee.images && employee.images.length > 0 && (
                <div className="mb-4 overflow-x-auto employee-gallery">
                  <div className="flex gap-2 sm:gap-3 pb-2" style={{ minWidth: 'min-content' }}>
                    {employee.images.map((img, idx) => (
                      <div key={idx} className="flex-shrink-0 relative w-36 h-36 sm:w-48 sm:h-48 rounded-lg overflow-hidden shadow-md">
                        <Image
                          src={img}
                          alt={`${employee.name} - photo ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mb-3 sm:mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2 flex-wrap">
                  <EmployeeName employeeId={employee.id} name={employee.name} />
                  <TierBadge employeeId={employee.id} size="sm" showXp />
                </h2>
                {shouldShowRole(employee.id) && (
                  <p className="text-blue-600 dark:text-blue-400 font-semibold text-base sm:text-lg">{employee.role}</p>
                )}
              </div>
              {employee.bio && (
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">{employee.bio}</p>
              )}
            </div>
          ))}
        </div>

        {firedList.length > 0 && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold mt-12 mb-6 text-red-600 dark:text-red-500">Fired</h2>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {firedList.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-md p-4 sm:p-6 scroll-mt-20 border border-red-200 dark:border-red-800"
                >
                  <div className="mb-3 sm:mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2 flex-wrap">
                      <EmployeeName employeeId={employee.id} name={employee.name} />
                      <TierBadge employeeId={employee.id} size="sm" />
                    </h2>
                    <p className="text-red-600 dark:text-red-400 font-semibold text-base sm:text-lg">{employee.role}</p>
                  </div>
                  {employee.bio && (
                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">{employee.bio}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
