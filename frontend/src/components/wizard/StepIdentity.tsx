/**
 * StepIdentity — paso 3 del wizard.
 *
 * Recolecta nombre, apellido y cédula (formato V/E + 6-8 dígitos). Los
 * errores de validación se muestran vía TextField (aria-invalid + aria-describedby).
 *
 * TODO(US1 shared): cuando `packages/shared` exponga el schema Zod
 * (`packages/shared/src/schemas/id-number.ts` de T016) y el de creación de
 * cita (T017 `createAppointmentSchema`), reemplazar `identitySchema` local
 * por el import compartido para no duplicar la regla.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { TextField } from '../ui/TextField';
import type { WizardData } from './wizard-state';

interface StepIdentityProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

// TODO(shared): mover a packages/shared/src/schemas/appointments.ts (T017).
const identitySchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Ingresa tu nombre.')
    .max(60, 'Máximo 60 caracteres.'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Ingresa tu apellido.')
    .max(60, 'Máximo 60 caracteres.'),
  idNumber: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase().replace(/[-\s]/g, ''))
    .pipe(
      z
        .string()
        .regex(/^[VE]\d{6,8}$/, 'Formato esperado: V12345678 o E12345678.'),
    ),
});

type IdentityFormValues = z.infer<typeof identitySchema>;

export function StepIdentity({ data, onChange }: StepIdentityProps): JSX.Element {
  const {
    register,
    watch,
    formState: { errors },
  } = useForm<IdentityFormValues>({
    resolver: zodResolver(identitySchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: data.firstName,
      lastName: data.lastName,
      idNumber: data.idNumber,
    },
  });

  // Propagar cada cambio al estado del wizard para que el shell pueda
  // habilitar 'Siguiente' vía canAdvanceFromCurrentStep. Usamos react-hook-form
  // como fuente de verdad local; el shell recibe una copia sincronizada.
  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const idNumber = watch('idNumber');
  useEffect(() => {
    onChange({
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      idNumber: idNumber ?? '',
    });
  }, [firstName, lastName, idNumber, onChange]);

  return (
    <form className="mt-4 flex flex-col gap-4" noValidate>
      <TextField
        label="Nombre"
        autoComplete="given-name"
        required
        {...register('firstName')}
        {...(errors.firstName?.message && { error: errors.firstName.message })}
      />
      <TextField
        label="Apellido"
        autoComplete="family-name"
        required
        {...register('lastName')}
        {...(errors.lastName?.message && { error: errors.lastName.message })}
      />
      <TextField
        label="Cédula de identidad"
        autoComplete="off"
        inputMode="text"
        required
        placeholder="V12345678"
        hint="Debe empezar por V o E seguidos de 6 a 8 dígitos, sin guion."
        {...register('idNumber')}
        {...(errors.idNumber?.message && { error: errors.idNumber.message })}
      />
    </form>
  );
}
