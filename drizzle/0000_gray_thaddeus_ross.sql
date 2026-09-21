CREATE TABLE `broker_account` (
	`id` text PRIMARY KEY NOT NULL,
	`broker` text NOT NULL,
	`display_name` text NOT NULL,
	`base_currency` text
);
--> statement-breakpoint
CREATE TABLE `calculation_run` (
	`id` text PRIMARY KEY NOT NULL,
	`tax_year` integer NOT NULL,
	`rules_version` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`input_fingerprint` text NOT NULL,
	`result_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `calculation_run_tax_year_idx` ON `calculation_run` (`tax_year`);--> statement-breakpoint
CREATE TABLE `credit_claim` (
	`id` text PRIMARY KEY NOT NULL,
	`tax_year` integer NOT NULL,
	`type` text NOT NULL,
	`input_amount` text,
	`eligible_amount` text,
	`estimated_tax_value` text DEFAULT '0' NOT NULL,
	`status` text NOT NULL,
	`evidence_note` text
);
--> statement-breakpoint
CREATE INDEX `credit_claim_tax_year_idx` ON `credit_claim` (`tax_year`);--> statement-breakpoint
CREATE TABLE `dividend_income` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`tax_year` integer NOT NULL,
	`instrument_id` text NOT NULL,
	`jurisdiction` text NOT NULL,
	`gross_eur` text NOT NULL,
	`foreign_tax_withheld_eur` text DEFAULT '0' NOT NULL,
	`irish_dwt_withheld_eur` text DEFAULT '0' NOT NULL,
	`irish_encashment_tax_eur` text DEFAULT '0' NOT NULL,
	`treatment` text NOT NULL,
	`verified_by_user` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `investment_transaction`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instrument_id`) REFERENCES `instrument`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `dividend_tax_year_idx` ON `dividend_income` (`tax_year`);--> statement-breakpoint
CREATE TABLE `employment_record` (
	`id` text PRIMARY KEY NOT NULL,
	`tax_year` integer NOT NULL,
	`employer_name` text NOT NULL,
	`employer_registration_number` text,
	`start_date` text,
	`end_date` text,
	`gross_pay` text NOT NULL,
	`pay_for_income_tax` text NOT NULL,
	`pay_for_usc` text NOT NULL,
	`income_tax_deducted` text NOT NULL,
	`usc_deducted` text NOT NULL,
	`prsi_deducted` text NOT NULL,
	`pension_contributions_payroll_relieved` text,
	`other_deduction_amount` text,
	`source` text NOT NULL,
	`source_document_id` text,
	`verified_by_user` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `employment_tax_year_idx` ON `employment_record` (`tax_year`);--> statement-breakpoint
CREATE TABLE `import_batch` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`duplicate_count` integer DEFAULT 0 NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `import_batch_started_at_idx` ON `import_batch` (`started_at`);--> statement-breakpoint
CREATE TABLE `instrument` (
	`id` text PRIMARY KEY NOT NULL,
	`symbol` text NOT NULL,
	`isin` text,
	`name` text,
	`currency` text NOT NULL,
	`tax_treatment` text DEFAULT 'UNKNOWN' NOT NULL,
	`tax_treatment_confirmed_by_user` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interest_income` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text,
	`tax_year` integer NOT NULL,
	`source_type` text NOT NULL,
	`jurisdiction` text,
	`gross_eur` text NOT NULL,
	`tax_withheld_eur` text DEFAULT '0' NOT NULL,
	`verified_by_user` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `investment_transaction`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `interest_tax_year_idx` ON `interest_income` (`tax_year`);--> statement-breakpoint
CREATE TABLE `investment_transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`broker_account_id` text NOT NULL,
	`instrument_id` text,
	`transaction_type` text NOT NULL,
	`timestamp` text NOT NULL,
	`trade_date` text NOT NULL,
	`quantity` text,
	`unit_price` text,
	`gross_amount` text,
	`fee_amount` text,
	`withholding_tax_amount` text,
	`currency` text NOT NULL,
	`eur_fx_rate` text,
	`eur_gross_amount` text,
	`eur_fee_amount` text,
	`eur_withholding_tax_amount` text,
	`external_id` text,
	`import_batch_id` text NOT NULL,
	`raw_description` text,
	`review_status` text DEFAULT 'REQUIRES_REVIEW' NOT NULL,
	FOREIGN KEY (`broker_account_id`) REFERENCES `broker_account`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instrument_id`) REFERENCES `instrument`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`import_batch_id`) REFERENCES `import_batch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transaction_batch_idx` ON `investment_transaction` (`import_batch_id`);--> statement-breakpoint
CREATE INDEX `transaction_broker_idx` ON `investment_transaction` (`broker_account_id`);--> statement-breakpoint
CREATE INDEX `transaction_instrument_idx` ON `investment_transaction` (`instrument_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_external_id_unique` ON `investment_transaction` (`broker_account_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `revenue_document` (
	`id` text PRIMARY KEY NOT NULL,
	`document_type` text NOT NULL,
	`tax_year` integer,
	`imported_at` text NOT NULL,
	`parser_version` text NOT NULL,
	`parse_status` text NOT NULL,
	`raw_file_retained` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `statement_of_liability` (
	`id` text PRIMARY KEY NOT NULL,
	`tax_year` integer NOT NULL,
	`income_tax_liability` text,
	`usc_liability` text,
	`income_tax_paid` text,
	`usc_paid` text,
	`overpayment` text,
	`underpayment` text,
	`source_document_id` text NOT NULL,
	`verified_by_user` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`source_document_id`) REFERENCES `revenue_document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `statement_liability_tax_year_idx` ON `statement_of_liability` (`tax_year`);--> statement-breakpoint
CREATE TABLE `tax_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`tax_year` integer NOT NULL,
	`residence_status` text NOT NULL,
	`domicile_status` text NOT NULL,
	`assessment_status` text NOT NULL,
	`date_of_birth` text,
	`student_status` integer DEFAULT false NOT NULL,
	`full_time_student` integer,
	`unemployed_at_year_end` integer DEFAULT false NOT NULL,
	`unemployment_start_date` text,
	`receives_taxable_social_welfare` integer DEFAULT false NOT NULL,
	`calculation_status` text NOT NULL
);
