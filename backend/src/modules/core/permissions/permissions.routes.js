const express = require('express');
const validate = require('../../../middlewares/validate');
const authorize = require('../../../middlewares/authorize');
const controller = require('./permissions.controller');
const { createPermissionSchema, updatePermissionSchema, listQuerySchema, idParamSchema } = require('./permissions.validation');

const router = express.Router();

// Mount với `authenticate` ở app.js (prefix /api/superadmin/permissions) — yêu cầu `permissions.manage`.
router.use(authorize('permissions.manage'));

router.get('/', validate({ query: listQuerySchema }), controller.list);
router.post('/', validate({ body: createPermissionSchema }), controller.create);
router.patch('/:id', validate({ params: idParamSchema, body: updatePermissionSchema }), controller.update);
router.delete('/:id', validate({ params: idParamSchema }), controller.remove);

module.exports = router;
