import { AppError } from "./AppError";

export type FieldErrors = Record<string, string>;

// Format response validation thống nhất: { success: false, message: "Validation failed", errors: {...} }
export class ValidationError extends AppError {
  readonly errors: FieldErrors;

  constructor(errors: FieldErrors) {
    super("Validation failed", 422, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.errors = errors;
  }
}
