import { Router } from 'express';
import { authorize, validate } from '../../../core/middleware';
import * as controller from './categories.controller';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesQuerySchema,
} from './categories.validation';

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/categories) — yêu cầu permission
// `categories.manage` (role admin/super_admin đều có qua domain.seed.ts, không chỉ riêng super_admin).
export const categoriesAdminRouter = Router();
categoriesAdminRouter.use(authorize('categories.manage'));

categoriesAdminRouter.get('/', validate({ query: listCategoriesQuerySchema }), controller.list);
categoriesAdminRouter.post('/', validate({ body: createCategorySchema }), controller.create);
categoriesAdminRouter.patch('/:id', validate({ params: categoryIdParamSchema, body: updateCategorySchema }), controller.update);
categoriesAdminRouter.delete('/:id', validate({ params: categoryIdParamSchema }), controller.remove);
