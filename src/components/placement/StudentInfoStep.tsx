import { component$, $ } from '@builder.io/qwik';
import {
  LuUser,
  LuPhone,
  LuCakeSlice,
  LuUsers,
  LuChevronDown,
  LuGraduationCap,
  LuSchool,
  LuArrowRight,
} from '@qwikest/icons/lucide';

export const PLACEMENT_AFTER_EXTRA_FIELDS = [
  'rep_name',
  'rep_phone',
  'institution',
  'student_grade',
  'student_age',
  'student_sex',
  'student_name',
] as const;

export type StudentInfoStore = {
  rep_name: string;
  rep_phone: string;
  institution: string;
  student_grade: string;
  student_age: string;
  student_sex: string;
  student_name: string;
};

interface StudentInfoStepProps {
  studentInfo: StudentInfoStore;
  onContinue$: () => void;
}

export const StudentInfoStep = component$(({ studentInfo, onContinue$ }: StudentInfoStepProps) => {
  const handleSubmit = $(() => {
    if (
      !studentInfo.rep_name ||
      !studentInfo.rep_phone ||
      !studentInfo.institution ||
      !studentInfo.student_grade ||
      !studentInfo.student_age ||
      !studentInfo.student_sex ||
      !studentInfo.student_name
    ) {
      alert('Por favor completa todos los campos para continuar.');
      return;
    }
    onContinue$();
  });

  return (
    <section class="max-w-3xl mx-auto">
      <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div class="bg-gradient-to-r from-teal-500 to-emerald-600 p-8 text-white">
          <h2 class="text-2xl font-bold mb-2">Registro de Estudiante</h2>
          <p class="text-teal-50 opacity-90">
            Completa los datos para iniciar tu evaluación de inglés.
          </p>
        </div>

        <div class="p-8">
          <form preventdefault:submit onSubmit$={handleSubmit} class="space-y-8">
            <div class="space-y-4">
              <h3 class="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                Información del Representante
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="group">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nombre Completo del Representante
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <LuUser class="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={studentInfo.rep_name}
                      onInput$={(e) =>
                        (studentInfo.rep_name = (e.target as HTMLInputElement).value)
                      }
                      class="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                      placeholder="Ej. María Pérez"
                      required
                    />
                  </div>
                </div>

                <div class="group">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Teléfono de Contacto
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <LuPhone class="w-5 h-5" />
                    </div>
                    <input
                      type="tel"
                      value={studentInfo.rep_phone}
                      onInput$={(e) =>
                        (studentInfo.rep_phone = (e.target as HTMLInputElement).value)
                      }
                      class="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                      placeholder="Ej. +58 412 1234567"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4 mt-8">
              <h3 class="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                Datos del Alumno
              </h3>

              <div class="group">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nombre del Alumno
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <LuUser class="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={studentInfo.student_name}
                    onInput$={(e) =>
                      (studentInfo.student_name = (e.target as HTMLInputElement).value)
                    }
                    class="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    placeholder="Nombre completo del estudiante"
                    required
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="group">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Edad
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <LuCakeSlice class="w-5 h-5" />
                    </div>
                    <input
                      type="number"
                      min={5}
                      max={99}
                      value={studentInfo.student_age}
                      onInput$={(e) =>
                        (studentInfo.student_age = (e.target as HTMLInputElement).value)
                      }
                      class="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                      placeholder="Años"
                      required
                    />
                  </div>
                </div>

                <div class="group">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Sexo
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <LuUsers class="w-5 h-5" />
                    </div>
                    <select
                      value={studentInfo.student_sex}
                      onChange$={(e) =>
                        (studentInfo.student_sex = (e.target as HTMLSelectElement).value)
                      }
                      class="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none appearance-none"
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                      <LuChevronDown class="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div class="group">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Grado
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <LuGraduationCap class="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={studentInfo.student_grade}
                      onInput$={(e) =>
                        (studentInfo.student_grade = (e.target as HTMLInputElement).value)
                      }
                      class="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                      placeholder="Ej. 4to Grado"
                      required
                    />
                  </div>
                </div>
              </div>

              <div class="group">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Institución Educativa
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <LuSchool class="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={studentInfo.institution}
                    onInput$={(e) =>
                      (studentInfo.institution = (e.target as HTMLInputElement).value)
                    }
                    class="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    placeholder="Nombre del colegio o escuela"
                    required
                  />
                </div>
              </div>
            </div>

            <div class="pt-4">
              <button
                type="submit"
                class="w-full md:w-auto ml-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                <span>Continuar a la Prueba</span>
                <LuArrowRight class="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
});
