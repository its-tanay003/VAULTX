"use client";

import { useState, useCallback } from "react";

/**
 * useFormState hook — handles form errors inline rather than
 * exclusively via toasts. Previously all 14 modules used:
 *
 *   } catch (err) { toast.error(err.message) }
 *
 * Problem: toasts are ephemeral and auto-dismiss. For form errors
 * (validation failures, server errors), the user needs to see the
 * error while still filling in the form — a toast that disappears
 * after 4 seconds while they're typing is worse than no error at all.
 *
 * This hook returns:
 *   - error:     current error string (shown inline in the form)
 *   - setError:  set a new error
 *   - clearError: dismiss the current error
 *   - withError: wrapper that catches and displays errors from async fns
 *
 * Usage:
 *   const { error, withError } = useFormError();
 *
 *   async function handleSubmit() {
 *     await withError(async () => {
 *       await createEngagement(formData);
 *     });
 *   }
 *
 *   // In JSX:
 *   <FormError message={error} />
 *   <button onClick={handleSubmit}>Submit</button>
 */
export function useFormError() {
  const [error, setError]   = useState<string | null>(null);
  const clearError          = useCallback(() => setError(null), []);

  const withError = useCallback(async (fn: () => Promise<void>) => {
    try {
      clearError();
      await fn();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      // Scroll the error into view so it's visible if form is long
      setTimeout(() => {
        document.querySelector("[data-form-error]")?.scrollIntoView({
          behavior: "smooth",
          block:    "nearest",
        });
      }, 50);
    }
  }, [clearError]);

  return { error, setError, clearError, withError };
}

/**
 * useFieldErrors — for forms with per-field validation.
 * Maps field names to error messages.
 *
 * Usage:
 *   const { fieldErrors, setFieldError, clearFieldErrors, validateRequired } = useFieldErrors();
 *   validateRequired({ title, description }); // sets errors for empty fields
 *   <TextInput name="title" error={fieldErrors.title} />
 */
export function useFieldErrors() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldErrors = useCallback(() => setFieldErrors({}), []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validateRequired = useCallback((fields: Record<string, string | undefined | null>) => {
    const errors: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (!value?.trim()) {
        errors[key] = `${key.replace(/_/g, " ")} is required`;
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0; // true = valid
  }, []);

  return { fieldErrors, setFieldError, clearFieldError, clearFieldErrors, validateRequired };
}
