PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sets` (
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
	FOREIGN KEY (`entrenamiento_id`) REFERENCES `entrenamientos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sets`("id", "entrenamiento_id", "ejercicio_id", "set_number", "reps", "weight", "duration", "completed", "rest_time", "rpe", "notes", "created_at") SELECT "id", "entrenamiento_id", "ejercicio_id", "set_number", "reps", "weight", "duration", "completed", "rest_time", "rpe", "notes", "created_at" FROM `sets`;--> statement-breakpoint
DROP TABLE `sets`;--> statement-breakpoint
ALTER TABLE `__new_sets` RENAME TO `sets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;