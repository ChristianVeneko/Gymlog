CREATE TABLE `ai_recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`recommendation` text NOT NULL,
	`priority` text DEFAULT 'medium',
	`status` text DEFAULT 'active',
	`valid_until` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ejercicios` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_es` text,
	`body_part` text,
	`equipment` text,
	`target` text,
	`instructions` text,
	`secondary_muscles` text,
	`gif_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `entrenamientos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`rutina_id` text NOT NULL,
	`fecha` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`duration` integer,
	`notes` text,
	`completed` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rutina_id`) REFERENCES `rutinas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `personal_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ejercicio_id` text NOT NULL,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`reps` integer,
	`fecha` text NOT NULL,
	`entrenamiento_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entrenamiento_id`) REFERENCES `entrenamientos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rutina_ejercicios` (
	`id` text PRIMARY KEY NOT NULL,
	`rutina_id` text NOT NULL,
	`ejercicio_id` text NOT NULL,
	`sets` integer NOT NULL,
	`reps` text,
	`weight` real,
	`rest_time` integer,
	`order` integer NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`rutina_id`) REFERENCES `rutinas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rutinas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`days_of_week` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sets` (
	`id` text PRIMARY KEY NOT NULL,
	`entrenamiento_id` text NOT NULL,
	`ejercicio_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer,
	`weight` real,
	`duration` integer,
	`completed` integer DEFAULT false,
	`rest_time` integer,
	`rpe` integer,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`entrenamiento_id`) REFERENCES `entrenamientos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`target_value` real,
	`current_value` real,
	`target_date` text,
	`achieved` integer DEFAULT false,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`fecha` text NOT NULL,
	`weight` real,
	`body_fat` real,
	`muscle_mass` real,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`name` text NOT NULL,
	`avatar` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);