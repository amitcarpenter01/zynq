CREATE TABLE tbl_admin (
  admin_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  full_name varchar(191) NULL,
  email varchar(191) NULL,
  password varchar(191) NULL,
  mobile_number varchar(191) NOT NULL UNIQUE,
  fcm_token varchar(191) NULL,
  profile_image varchar(191) NULL,
  language varchar(191) NULL,
  jwt_token varchar(191) NULL,
  is_verified tinyint(1) NOT NULL DEFAULT 0,
  is_active tinyint(1) NOT NULL DEFAULT 0,
  is_push_notification_on tinyint(1) NOT NULL DEFAULT 1,
  is_location_on tinyint(1) NOT NULL DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_appointments (
  appointment_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  doctor_id varchar(36) NULL,
  patient_id varchar(36) NOT NULL,
  clinic_id varchar(36) NULL,
  appointment_date date NULL,
  start_time time NULL,
  end_time time NULL,
  type enum('Offline','Video Call') NULL,
  status enum('Upcoming','Completed','Rescheduled','Cancelled') NULL,
  fee decimal(10,2) NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_certification_type (
  certification_type_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name varchar(255) NOT NULL UNIQUE,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_clinic_documents (
  clinic_document_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  clinic_id varchar(36) NOT NULL,
  document_type varchar(255) NOT NULL,
  file_url varchar(500) NOT NULL,
  certification_type_id varchar(36) NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_support_tickets (
  support_ticket_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  clinic_id VARCHAR(36) DEFAULT NULL,
  doctor_id VARCHAR(36) DEFAULT NULL,
  issue_category_id VARCHAR(36) NOT NULL,
  issue_title VARCHAR(255) NOT NULL,
  issue_description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE tbl_clinic_equipments (
  clinic_equipment_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  clinic_id varchar(36) NOT NULL,
  equipment_id varchar(36) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_clinic_locations (
  clinic_location_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  clinic_id varchar(36) NOT NULL,
  street_address varchar(255) NOT NULL,
  city varchar(100) NOT NULL,
  state varchar(100) NOT NULL,
  zip_code varchar(20) NOT NULL,
  latitude decimal(10,8) NULL,
  longitude decimal(11,8) NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_clinic_operation_hours (
  clinic_operation_hours_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  clinic_id varchar(36) NOT NULL,
  day_of_week enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  open_time time NOT NULL,
  close_time time NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_clinic_services (
  clinic_service_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  clinic_id varchar(36) NOT NULL,
  service_name varchar(255) NULL,
  service_type varchar(255) NULL,
  service_for_skintype varchar(255) NULL,
  min_fee decimal(10,2) NULL,
  max_fee decimal(10,2) NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_clinic_severity_levels (
  clinic_severity_level_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  clinic_id varchar(36) NOT NULL,
  severity_id varchar(36) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_clinic_skin_types (
  clinic_skin_type_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  clinic_id varchar(36) NOT NULL,
  skin_type_id varchar(36) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_clinic_treatments (
  clinic_treatment_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  clinic_id varchar(36) NOT NULL,
  treatment_id varchar(36) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_clinics (
  clinic_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  zynq_user_id varchar(255) NULL,
  clinic_name varchar(255) NOT NULL,
  org_number varchar(50) NULL,
  email varchar(255) NULL,
  mobile_number varchar(50) NULL,
  address text NULL,
  is_invited tinyint(1) NULL DEFAULT 0,
  is_active tinyint(1) NULL DEFAULT 0,
  onboarding_token varchar(255) NULL,
  profile_completion_percentage int NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  email_sent_at timestamp NULL,
  email_sent_count int NULL DEFAULT 0
);

CREATE TABLE tbl_doctor_certification (
  doctor_certification_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  doctor_id varchar(36) NOT NULL,
  certification_type_id varchar(36) NOT NULL,
  upload_path varchar(255) NULL,
  issue_date date NULL,
  expiry_date date NULL,
  issuing_authority varchar(255) NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_doctor_clinic_map (
  map_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  doctor_id varchar(36) NOT NULL,
  clinic_id varchar(36) NOT NULL,
  assigned_at timestamp NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_doctor_educations (
  education_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  doctor_id varchar(36) NULL,
  degree varchar(100) NULL,
  institution varchar(150) NULL,
  start_year year NULL,
  end_year year NULL,
  education_type enum('UG','PG') NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_doctor_experiences (
  experience_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  doctor_id varchar(36) NULL,
  title varchar(100) NULL,
  start_date date NULL,
  end_date date NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_doctor_reviews (
  doctor_review_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  appointment_id varchar(36) NULL,
  doctor_id varchar(36) NULL,
  clinic_id varchar(36) NULL,
  patient_id varchar(36) NOT NULL,
  rating int NULL,
  review_text text NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_doctors (
  doctor_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  zynq_user_id varchar(255) NOT NULL,
  name varchar(100) NULL,
  specialization varchar(100) NULL,
  employee_id varchar(20) NULL UNIQUE,
  experience_years int NULL,
  rating decimal(2,1) NULL,
  fee_per_session decimal(10,2) NULL,
  phone varchar(20) NULL,
  email varchar(100) NULL,
  age int NULL,
  address text NULL,
  biography text NULL,
  gender enum('Male','Female','Other') NULL,
  profile_image text NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_equipments (
  equipment_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name varchar(255) NOT NULL UNIQUE
);

CREATE TABLE tbl_face_scan_results (
  face_scan_result_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  skin_type varchar(255) NULL,
  skin_concerns varchar(255) NULL,
  face varchar(255) NULL,
  details longtext NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id varchar(36) NOT NULL,
  aiAnalysisResult text NULL,
  scoreInfo text NULL
);

CREATE TABLE tbl_product_reviews (
  review_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  product_id varchar(36) NOT NULL,
  user_id varchar(36) NOT NULL,
  rating float NOT NULL,
  comment text NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_product_usage_instructions (
  instruction_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  product_id varchar(36) NOT NULL,
  step_number int NOT NULL,
  instruction_text text NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_products (
  product_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  clinic_id varchar(36) NOT NULL,
  name varchar(100) NOT NULL,
  price decimal(10,2) NOT NULL,
  rating float NULL DEFAULT 0,
  short_description text NULL,
  full_description text NULL,
  feature_text varchar(255) NOT NULL,
  size_label varchar(50) NOT NULL,
  image_url varchar(255) NULL,
  benefit_text varchar(255) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_roles (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  role varchar(255) NOT NULL DEFAULT 'CLINIC' UNIQUE
);

CREATE TABLE tbl_severity_levels (
  severity_level_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  level varchar(100) NOT NULL UNIQUE
);

CREATE TABLE tbl_skin_types (
  skin_type_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name varchar(100) NOT NULL UNIQUE
);

CREATE TABLE tbl_issue_categories (
  issue_category_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL
);


CREATE TABLE tbl_support_tickets (
  ticket_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title varchar(255) NOT NULL,
  date_raised date NOT NULL,
  issue_category varchar(100) NOT NULL,
  description text NOT NULL,
  status enum('Pending','Resolved') NOT NULL DEFAULT 'Pending',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_treatments (
  treatment_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name varchar(255) NOT NULL UNIQUE
);

CREATE TABLE tbl_users (
  user_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email varchar(191) NULL,
  password varchar(191) NULL,
  full_name varchar(191) NULL,
  age int NULL,
  gender varchar(191) NULL,
  mobile_number varchar(191) NOT NULL UNIQUE,
  fcm_token varchar(191) NULL,
  otp varchar(191) NULL,
  profile_image varchar(191) NULL,
  language varchar(191) NULL,
  jwt_token text NULL,
  is_verified tinyint(1) NOT NULL DEFAULT 0,
  is_active tinyint(1) NOT NULL DEFAULT 0,
  is_push_notification_on tinyint(1) NOT NULL DEFAULT 1,
  is_location_on tinyint(1) NOT NULL DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  latitude decimal(10,8) NULL,
  longitude decimal(11,8) NULL
);

CREATE TABLE tbl_zqnq_users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email varchar(255) NULL UNIQUE,
  password varchar(255) NULL,
  show_password varchar(255) NULL,
  jwt_token text NULL,
  reset_token varchar(255) NULL,
  reset_token_expiry varchar(255) NULL,
  fcm_token text NULL,
  role_id varchar(36) NOT NULL DEFAULT 1,
  language enum('en','sv') NOT NULL DEFAULT 'en'
);