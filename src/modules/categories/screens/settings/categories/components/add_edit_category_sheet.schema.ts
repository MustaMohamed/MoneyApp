import { z } from 'zod/v4';

import type { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Category } from '@/modules/categories/entities/category.entity';
import { stripNameEdges } from '@/utils/strip_name_edges';

export function createCategorySchema(
  categories: Category[],
  type: CategoryType,
  editingId?: string,
) {
  return z.object({
    name: z
      .string()
      .overwrite(stripNameEdges)
      .min(1, Strings.categoriesErrNameRequired)
      .max(50, Strings.categoriesErrNameTooLong)
      // A blank name already reads the required message; RHF renders only the first issue.
      .refine(
        (val) =>
          val.length === 0 ||
          !categories.some(
            (c) =>
              c.id !== editingId &&
              c.type === type &&
              stripNameEdges(c.name).toLowerCase() === val.toLowerCase(),
          ),
        Strings.categoriesErrNameDuplicate,
      ),
  });
}
