import 'server-only';
import { admin, pub } from './client';
import { unwrap } from './errors';

// Topics are rows with per-locale names (supabase/migrations/20261101000000_topics.sql). The rest of
// the app still sees a `category` string: the db layer derives it here.

export const DEFAULT_LOCALE = 'en';

// Joined through questions.topic_id.
export const TOPIC_EMBED = 'topics(slug, topic_translations(locale, name))';

export type TopicEmbed = { slug: string; topic_translations: Array<{ locale: string; name: string }> } | null;

export function topicName(topic: TopicEmbed, locale: string = DEFAULT_LOCALE): string {
  const names = topic?.topic_translations ?? [];
  const hit = names.find((n) => n.locale === locale) ?? names.find((n) => n.locale === DEFAULT_LOCALE) ?? names[0];
  return hit?.name ?? 'General';
}

export function withCategory<T extends { topics: TopicEmbed }>(row: T): Omit<T, 'topics'> & { category: string } {
  const { topics, ...rest } = row;
  return { ...rest, category: topicName(topics) };
}

// Case- and accent-insensitive: the same slug rule the database uses. Null when no such topic.
export async function resolveTopicId(name: string): Promise<string | null> {
  return (unwrap('rpc.resolve_topic', await pub.rpc('resolve_topic', { p_name: name })) as string | null) ?? null;
}

// Secret key: only the server creates topics.
export async function getOrCreateTopicId(name: string): Promise<string> {
  return unwrap('rpc.get_or_create_topic', await admin().rpc('get_or_create_topic', { p_name: name })) as string;
}
