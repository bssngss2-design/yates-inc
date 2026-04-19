import { employees, firedEmployees } from '@/utils/products';
import Image from 'next/image';
import EmployeeName from '@/components/EmployeeName';

export default function EmployeesPage() {
  return (
    <div className="min-h-screen py-8 sm:py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-gray-900 dark:text-white">Our Team</h1>
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 scroll-mt-20 hover:shadow-lg transition-shadow"
            >
              {/* Scrollable image gallery for employees with images */}
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  <EmployeeName employeeId={employee.id} name={employee.name} />
                </h2>
                <p className="text-blue-600 dark:text-blue-400 font-semibold text-base sm:text-lg">{employee.role}</p>
              </div>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">{employee.bio}</p>
            </div>
          ))}
        </div>

        {/* Fired Section */}
        {firedEmployees.length > 0 && (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold mt-12 mb-6 text-red-600 dark:text-red-500">Fired</h2>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {firedEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-md p-4 sm:p-6 scroll-mt-20 border border-red-200 dark:border-red-800"
                >
                  <div className="mb-3 sm:mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      <EmployeeName employeeId={employee.id} name={employee.name} />
                    </h2>
                    <p className="text-red-600 dark:text-red-400 font-semibold text-base sm:text-lg">{employee.role}</p>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">{employee.bio}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

