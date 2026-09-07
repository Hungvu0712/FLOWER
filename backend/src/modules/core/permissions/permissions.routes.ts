import { Router } from 'express';
import { authorize, validate } from '../../../core/middleware';
import * as controller from './permissions.controller';
import { createPermissionSchema, updatePermissionSchema, listPermissionsQuerySchema, permissionIdParamSchema } from './permissions.validation';

export const permissionsRouter = Router();

// Mount với `authenticate` ở app.ts (prefix /api/v1/superadmin/permissions) — yêu cầu `permissions.manage`.
permissionsRouter.use(authorize('permissions.manage'));

permissionsRouter.get('/', validate({ query: listPermissionsQuerySchema }), controller.list);
permissionsRouter.post('/', validate({ body: createPermissionSchema }), controller.create);
permissionsRouter.patch('/:id', validate({ params: permissionIdParamSchema, body: updatePermissionSchema }), controller.update);
permissionsRouter.delete('/:id', validate({ params: permissionIdParamSchema }), controller.remove);
