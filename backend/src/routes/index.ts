import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { DatasetRoutes } from '../app/modules/dataset/dataset/dataset.route';
import { ReportRoutes } from '../app/modules/dataset/report/report.route';
import { UserRoutes } from '../app/modules/entity/users/user.route';

const router = express.Router();

// Add one entry for every feature router.
const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/datasets',
    route: DatasetRoutes,
  },
  {
    path: '/reports',
    route: ReportRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
