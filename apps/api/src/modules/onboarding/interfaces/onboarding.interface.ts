/**
 * Onboarding & Training Module Interfaces
 *
 * Sistema de capacitación 30/60/90 días para baristas
 * Incluye módulos de entrenamiento, evaluaciones, certificaciones y tracking de progreso
 */

/**
 * Categorías de módulos de entrenamiento
 */
export enum TrainingCategory {
  ESPRESSO = 'espresso',
  DRINKS = 'drinks',
  CUSTOMER_SERVICE = 'customer_service',
  POS = 'pos',
  QUALITY = 'quality',
  SAFETY = 'safety',
  CLEANING = 'cleaning',
  INVENTORY = 'inventory',
  OPENING = 'opening',
  CLOSING = 'closing',
}

/**
 * Niveles de competencia
 */
export enum CompetencyLevel {
  NOVICE = 'novice', // 0-30 días: Aprendiendo básicos
  INTERMEDIATE = 'intermediate', // 31-60 días: Desarrollando habilidades
  ADVANCED = 'advanced', // 61-90 días: Dominando técnicas
  EXPERT = 'expert', // 90+ días: Mentor/trainer
}

/**
 * Estado de módulo de entrenamiento
 */
export enum TrainingModuleStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Tipo de evaluación
 */
export enum EvaluationType {
  THEORETICAL = 'theoretical', // Test teórico
  PRACTICAL = 'practical', // Evaluación práctica
  OBSERVATION = 'observation', // Observación por mentor
  SELF_ASSESSMENT = 'self_assessment', // Auto-evaluación
}

/**
 * Estado de evaluación
 */
export enum EvaluationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PASSED = 'passed',
  FAILED = 'failed',
}

/**
 * Estado de certificación
 */
export enum CertificationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended',
}

/**
 * Módulo de entrenamiento
 * Define un módulo específico de capacitación con contenido y requisitos
 */
export interface TrainingModule {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  category: TrainingCategory;
  level: CompetencyLevel;

  // Contenido
  objectives: string[]; // Objetivos de aprendizaje
  duration_minutes: number; // Duración estimada
  content_url?: string; // URL a contenido (video, PDF, etc.)

  // Requisitos
  prerequisites?: string[]; // IDs de módulos prerequisitos
  required_for_role?: string[]; // Roles que requieren este módulo

  // Evaluación
  has_evaluation: boolean;
  passing_score?: number; // Puntaje mínimo para aprobar (0-100)

  // Orden y agrupación
  order: number; // Orden de presentación
  days_target: number; // Día objetivo (dentro de 30/60/90)

  // Meta
  tags?: string[];
  is_active: boolean;

  // Auditoría
  created_at: Date;
  updated_at: Date;
}

/**
 * Progreso de empleado en un módulo
 */
export interface EmployeeModuleProgress {
  id: string;
  organization_id: string;
  employee_id: string;
  module_id: string;

  // Estado
  status: TrainingModuleStatus;

  // Progreso
  started_at?: Date;
  completed_at?: Date;
  progress_percentage: number; // 0-100
  time_spent_minutes?: number;

  // Evaluación
  evaluation_score?: number; // 0-100
  evaluation_attempts: number;
  last_attempt_at?: Date;

  // Asignación
  assigned_by?: string; // user_id del asignador
  mentor_id?: string; // user_id del mentor asignado

  // Notas
  notes?: string;
  feedback?: string; // Feedback del mentor

  // Auditoría
  created_at: Date;
  updated_at: Date;
}

/**
 * Evaluación de empleado
 */
export interface Evaluation {
  id: string;
  organization_id: string;
  employee_id: string;
  module_id?: string; // Opcional: evaluación puede ser general o de módulo

  // Tipo y estado
  type: EvaluationType;
  status: EvaluationStatus;

  // Información
  title: string;
  description?: string;

  // Scoring
  max_score: number;
  score?: number;
  passing_score: number;
  passed?: boolean;

  // Fechas
  scheduled_date?: Date;
  started_at?: Date;
  completed_at?: Date;
  due_date?: Date;

  // Evaluador
  evaluator_id?: string; // user_id del evaluador

  // Resultados
  questions?: EvaluationQuestion[];
  answers?: EvaluationAnswer[];

  // Feedback
  feedback?: string;
  strengths?: string[];
  areas_for_improvement?: string[];

  // Meta
  attempt_number: number;

  // Auditoría
  created_at: Date;
  updated_at: Date;
}

/**
 * Pregunta de evaluación
 */
export interface EvaluationQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'practical';
  options?: string[]; // Para multiple choice
  correct_answer?: string | string[]; // Respuesta correcta
  points: number;
  category?: string;
}

/**
 * Respuesta de evaluación
 */
export interface EvaluationAnswer {
  question_id: string;
  answer: string | string[];
  is_correct?: boolean;
  points_earned?: number;
  feedback?: string;
}

/**
 * Certificación
 */
export interface Certification {
  id: string;
  organization_id: string;
  employee_id: string;

  // Información
  name: string;
  description?: string;
  category: TrainingCategory;
  level: CompetencyLevel;

  // Fechas
  issued_date: Date;
  expiry_date?: Date;

  // Estado
  status: CertificationStatus;

  // Emisor
  issued_by: string; // user_id

  // Requisitos cumplidos
  modules_completed?: string[]; // IDs de módulos
  evaluations_passed?: string[]; // IDs de evaluaciones

  // Verificación
  certificate_number: string;
  certificate_url?: string; // URL a certificado PDF

  // Renovación
  is_renewable: boolean;
  renewal_reminder_days?: number;

  // Meta
  notes?: string;

  // Auditoría
  created_at: Date;
  updated_at: Date;
}

/**
 * Plan de onboarding (30/60/90 días)
 */
export interface OnboardingPlan {
  id: string;
  organization_id: string;
  employee_id: string;

  // Información
  name: string;
  description?: string;
  role: string; // Rol del empleado

  // Fechas
  start_date: Date;
  target_completion_date: Date; // Usualmente start_date + 90 días
  actual_completion_date?: Date;

  // Mentor
  mentor_id?: string; // user_id del mentor asignado

  // Progreso general
  total_modules: number;
  completed_modules: number;
  progress_percentage: number; // 0-100

  // Estado
  is_active: boolean;
  is_completed: boolean;

  // Milestones
  day_30_completed: boolean;
  day_60_completed: boolean;
  day_90_completed: boolean;
  day_30_completed_at?: Date;
  day_60_completed_at?: Date;
  day_90_completed_at?: Date;

  // Notas
  notes?: string;

  // Auditoría
  created_at: Date;
  updated_at: Date;
}

/**
 * Estadísticas de onboarding
 */
export interface OnboardingStats {
  organization_id: string;

  // Empleados activos en onboarding
  active_onboarding_count: number;
  completed_onboarding_count: number;

  // Por fase
  in_day_30_count: number; // 0-30 días
  in_day_60_count: number; // 31-60 días
  in_day_90_count: number; // 61-90 días

  // Progreso promedio
  average_progress_percentage: number;

  // Módulos
  total_modules_assigned: number;
  total_modules_completed: number;

  // Evaluaciones
  total_evaluations: number;
  total_evaluations_passed: number;
  total_evaluations_failed: number;
  average_evaluation_score: number;

  // Certificaciones
  total_certifications_issued: number;
  total_certifications_active: number;
  certifications_expiring_soon: number; // Próximos 30 días

  // Performance
  average_completion_days: number;
  completion_rate: number; // % que completan en 90 días

  // Por categoría
  modules_by_category: Record<TrainingCategory, number>;
  completion_by_category: Record<TrainingCategory, number>;
}

/**
 * Reporte de progreso individual
 */
export interface EmployeeProgressReport {
  employee_id: string;
  employee_name?: string;
  onboarding_plan: OnboardingPlan;

  // Progreso actual
  current_day: number; // Días desde inicio
  current_phase: '30' | '60' | '90' | 'complete';
  progress_percentage: number;

  // Módulos
  total_modules: number;
  completed_modules: number;
  in_progress_modules: number;
  not_started_modules: number;

  // Evaluaciones
  total_evaluations: number;
  passed_evaluations: number;
  failed_evaluations: number;
  pending_evaluations: number;
  average_score: number;

  // Certificaciones
  certifications_earned: number;

  // Performance indicators
  is_on_track: boolean; // Cumple con timeline
  days_behind?: number;
  days_ahead?: number;

  // Próximos pasos
  next_modules?: TrainingModule[];
  upcoming_evaluations?: Evaluation[];

  // Tiempo
  total_training_hours: number;
}
