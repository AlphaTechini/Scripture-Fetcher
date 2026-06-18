import {
	pgTable,
	uuid,
	text,
	boolean,
	timestamp,
	integer,
	jsonb,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	email: text('email').unique(),
	password: text('password'),
	translation: text('translation').notNull().default('KJV'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const motivationalQuotes = pgTable('motivational_quotes', {
	id: uuid('id').primaryKey().defaultRandom(),
	verseReference: text('verse_reference').notNull(),
	verseText: text('verse_text').notNull(),
	moodTags: text('mood_tags').array().default([]),
	categoryTags: text('category_tags').array().default([]),
	seasonTags: text('season_tags').array().default([])
});

export const quoteLogs = pgTable('quote_logs', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	quoteId: uuid('quote_id')
		.notNull()
		.references(() => motivationalQuotes.id),
	shownAt: timestamp('shown_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	mood: text('mood').notNull(),
	category: text('category').notNull(),
	timeOfDay: text('time_of_day').notNull(),
	timeOfYear: text('time_of_year').notNull(),
	currentDateText: text('current_date_text').notNull(),
	userNotes: text('user_notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const alternatives = pgTable('alternatives', {
	id: uuid('id').primaryKey().defaultRandom(),
	sessionId: uuid('session_id')
		.notNull()
		.references(() => sessions.id, { onDelete: 'cascade' }),
	label: text('label').notNull(),
	influenceType: text('influence_type', {
		enum: ['primary', 'historical', 'user_directed']
	}).notNull(),
	storyTitle: text('story_title').notNull(),
	storySummary: text('story_summary').notNull(),
	reasoning: text('reasoning'),
	picked: boolean('picked').notNull().default(false),
	reusedFrom: uuid('reused_from').references((): AnyPgColumn => alternatives.id),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const passages = pgTable('passages', {
	id: uuid('id').primaryKey().defaultRandom(),
	alternativeId: uuid('alternative_id')
		.notNull()
		.references(() => alternatives.id, { onDelete: 'cascade' }),
	reference: text('reference').notNull(),
	passageText: text('passage_text').notNull(),
	book: text('book').notNull(),
	chapter: text('chapter').notNull(),
	orderIndex: integer('order_index').notNull().default(0)
});

export const prayerPoints = pgTable('prayer_points', {
	id: uuid('id').primaryKey().defaultRandom(),
	alternativeId: uuid('alternative_id')
		.notNull()
		.references(() => alternatives.id, { onDelete: 'cascade' }),
	content: text('content').notNull(),
	passageRef: text('passage_ref'),
	orderIndex: integer('order_index').notNull().default(0)
});

export const comments = pgTable('comments', {
	id: uuid('id').primaryKey().defaultRandom(),
	sessionId: uuid('session_id')
		.notNull()
		.references(() => sessions.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	content: text('content').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const versesRead = pgTable('verses_read', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	sessionId: uuid('session_id')
		.notNull()
		.references(() => sessions.id, { onDelete: 'cascade' }),
	alternativeId: uuid('alternative_id').references(() => alternatives.id, { onDelete: 'set null' }),
	verseReference: text('verse_reference').notNull(),
	markedAt: timestamp('marked_at', { withTimezone: true }).notNull().defaultNow()
});

export const bookmarks = pgTable('bookmarks', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	sessionId: uuid('session_id')
		.notNull()
		.references(() => sessions.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const usersRelations = relations(users, ({ many }) => ({
	quoteLogs: many(quoteLogs),
	sessions: many(sessions),
	comments: many(comments),
	versesRead: many(versesRead),
	bookmarks: many(bookmarks)
}));

export const motivationalQuotesRelations = relations(motivationalQuotes, ({ many }) => ({
	quoteLogs: many(quoteLogs)
}));

export const quoteLogsRelations = relations(quoteLogs, ({ one }) => ({
	user: one(users, {
		fields: [quoteLogs.userId],
		references: [users.id]
	}),
	quote: one(motivationalQuotes, {
		fields: [quoteLogs.quoteId],
		references: [motivationalQuotes.id]
	})
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
	alternatives: many(alternatives),
	comments: many(comments),
	versesRead: many(versesRead),
	bookmarks: many(bookmarks)
}));

export const alternativesRelations = relations(alternatives, ({ one, many }) => ({
	session: one(sessions, {
		fields: [alternatives.sessionId],
		references: [sessions.id]
	}),
	reusedFromAlt: one(alternatives, {
		fields: [alternatives.reusedFrom],
		references: [alternatives.id],
		relationName: 'reusedFrom'
	}),
	passages: many(passages),
	prayerPoints: many(prayerPoints),
	versesRead: many(versesRead)
}));

export const passagesRelations = relations(passages, ({ one }) => ({
	alternative: one(alternatives, {
		fields: [passages.alternativeId],
		references: [alternatives.id]
	})
}));

export const prayerPointsRelations = relations(prayerPoints, ({ one }) => ({
	alternative: one(alternatives, {
		fields: [prayerPoints.alternativeId],
		references: [alternatives.id]
	})
}));

export const commentsRelations = relations(comments, ({ one }) => ({
	session: one(sessions, {
		fields: [comments.sessionId],
		references: [sessions.id]
	}),
	user: one(users, {
		fields: [comments.userId],
		references: [users.id]
	})
}));

export const versesReadRelations = relations(versesRead, ({ one }) => ({
	user: one(users, {
		fields: [versesRead.userId],
		references: [users.id]
	}),
	session: one(sessions, {
		fields: [versesRead.sessionId],
		references: [sessions.id]
	}),
	alternative: one(alternatives, {
		fields: [versesRead.alternativeId],
		references: [alternatives.id]
	})
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
	user: one(users, {
		fields: [bookmarks.userId],
		references: [users.id]
	}),
	session: one(sessions, {
		fields: [bookmarks.sessionId],
		references: [sessions.id]
	})
}));
