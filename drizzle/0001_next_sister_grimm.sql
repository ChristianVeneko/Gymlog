PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_rutina_ejercicios` (
	`id` text PRIMARY KEY NOT NULL,
	`rutina_id` text NOT NULL,
	`ejercicio_id` text NOT NULL,
	`ejercicio_name` text NOT NULL,
	`ejercicio_name_es` text,
	`body_part` text,
	`equipment` text,
	`target` text,
	`gif_url` text,
	`day_of_week` text NOT NULL,
	`sets` integer,
	`reps` text,
	`weight` real,
	`rest_time` integer,
	`order` integer NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`rutina_id`) REFERENCES `rutinas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_rutina_ejercicios`("id", "rutina_id", "ejercicio_id", "ejercicio_name", "ejercicio_name_es", "body_part", "equipment", "target", "gif_url", "day_of_week", "sets", "reps", "weight", "rest_time", "order", "notes", "created_at") SELECT "id", "rutina_id", "ejercicio_id", "ejercicio_name", "ejercicio_name_es", "body_part", "equipment", "target", "gif_url", "day_of_week", "sets", "reps", "weight", "rest_time", "order", "notes", "created_at" FROM `rutina_ejercicios`;--> statement-breakpoint
DROP TABLE `rutina_ejercicios`;--> statement-breakpoint
ALTER TABLE `__new_rutina_ejercicios` RENAME TO `rutina_ejercicios`;--> statement-breakpoint
PRAGMA foreign_keys=ON;