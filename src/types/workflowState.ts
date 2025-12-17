export type Patient = {
  id: string;
  label: string;
};

export type WorkflowState = {
  selectedPatient: Patient | null;
  caseId: string;
  indication: string;
  hasSurgeryDate: boolean;
  surgeryDate: string; // YYYY-MM-DD
};
