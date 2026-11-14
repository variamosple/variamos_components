export interface BugFormFields {
  title: string;
  description: string;
}

export const TITLE_MAX_LENGTH = 100;

/**
 * The message of each invalid field, or nothing for a valid one. The form
 * shows them only after a submission attempt, and writes no message text
 * otherwise, so that no style of the host application can show it early.
 */
export function bugFormErrors({
  title,
  description,
}: BugFormFields): Partial<Record<keyof BugFormFields, string>> {
  const errors: Partial<Record<keyof BugFormFields, string>> = {};
  if (title.trim() === "" || title.length > TITLE_MAX_LENGTH) {
    errors.title = `Title is required (max ${TITLE_MAX_LENGTH} characters)`;
  }
  if (description.trim() === "") {
    errors.description = "Description is required";
  }
  return errors;
}
