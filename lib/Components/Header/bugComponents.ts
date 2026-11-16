// The parts of VariaMos a bug concerns, as the admin service accepts them
// (variamos_ms_admin, src/Domain/Bug/Entity/BugComponent.ts; EV-84)
export const BUG_COMPONENTS = [
  { value: "language", label: "Language" },
  { value: "model", label: "Model" },
  { value: "microservice", label: "Microservice" },
  { value: "admin", label: "Administration interface" },
  { value: "other", label: "Other" },
] as const;
