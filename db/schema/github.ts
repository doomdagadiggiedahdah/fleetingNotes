import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core"
import { users } from "./auth"

export const githubInstallations = pgTable(
	"github_installations",
	{
		installationId: text("installation_id").primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id),
		setupAction: text("setup_action"),
		installedAt: timestamp("installed_at").notNull(),
	},
	(table) => ({
		userIdIdx: uniqueIndex("github_installations_user_id_idx").on(table.userId),
	}),
)
