import { Router } from 'express';
import { validate } from '../../../shared/middleware';
import * as controller from './products.controller';
import { listProductsQuerySchema } from './products.validation';

// Công khai — storefront cần đọc được mà không cần đăng nhập. Xem products.admin.routes.ts cho CRUD.
export const productsRouter = Router();
productsRouter.get('/', validate({ query: listProductsQuerySchema }), controller.listPublic);
