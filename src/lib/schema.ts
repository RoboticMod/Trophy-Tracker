// The SQL itself lives in supabase/schema.sql so it can be opened and pasted
// into the Supabase SQL editor directly. Imported raw here so the app's
// "Copy schema SQL" button and the file on disk can never drift apart.
import schemaSql from '../../supabase/schema.sql?raw';

/**
 * PostgreSQL schema for Supabase, copyable from Settings.
 *
 * Every table is scoped by user_id with RLS enforced against auth.uid(), so a
 * signed-in account can only ever read or write its own rows.
 */
export const SUPABASE_SCHEMA_SQL: string = schemaSql;
