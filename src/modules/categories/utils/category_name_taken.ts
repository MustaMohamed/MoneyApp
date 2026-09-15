import { stripNameEdges } from '@/utils/strip_name_edges';

import type { Category } from '../entities/category.entity';

/** The caller scopes the type: pass only categories of the type the name is saved under. */
export function isCategoryNameTaken(
  categories: Category[],
  name: string,
  excludeId?: string,
): boolean {
  const wanted = stripNameEdges(name).toLowerCase();
  return categories.some(
    (c) => c.id !== excludeId && stripNameEdges(c.name).toLowerCase() === wanted,
  );
}
