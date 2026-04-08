import { Tag } from '../tag/types'
import { TaskWithTags } from './types'

type TaskTagJoin = {
  tags: Tag | null
} | null

export type TaskWithTaskTagsRow = Omit<TaskWithTags, 'tags'> & {
  task_tags?: TaskTagJoin[] | null
}

export function mapTaskWithTags(row: TaskWithTaskTagsRow): TaskWithTags {
  return {
    ...row,
    tags:
      row.task_tags
        ?.map((entry) => entry?.tags)
        .filter((tag): tag is Tag => Boolean(tag)) ?? [],
  }
}

export function mapTasksWithTags(rows: TaskWithTaskTagsRow[]): TaskWithTags[] {
  return rows.map(mapTaskWithTags)
}