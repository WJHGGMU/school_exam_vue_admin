import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

/* Layout */
import Layout from '@/layout'

/**
 * 路由配置说明
 * 动态子路径使用 :param 形式定义，如 :id 表示匹配任意值作为ID参数
 */
export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/login/index'),
    hidden: true
  },

  {
    path: '/404',
    component: () => import('@/views/404'),
    hidden: true
  },

  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [{
      path: 'dashboard',
      name: '主页',
      component: () => import('@/views/dashboard/index'),
      meta: { title: '主页', icon: 'dashboard' }
    }]
  },

  {
    path: '/org',
    component: Layout,
    redirect: '/org/index',
    children: [
      {
        path: 'index',
        name: '组织管理',
        component: () => import('@/views/tree/index'),
        meta: { title: '组织管理', icon: 'tree' }
      }
    ]
  },

  {
    path: '/exam',
    redirect: '/exam/index',
    component: Layout,
    meta: { title: '考试管理', icon: 'form' }, // 父菜单配置
    children: [
      // 考试列表（默认页）
      {
        path: 'index',
        name: 'ExamList',
        component: () => import('@/views/form/index'),
        meta: { title: '考试列表' }
      },
      {
        path: 'paper/:id',
        name: 'PaperDetail',
        component: () => import('@/views/form/paper'), // 需创建对应的详情组件
        meta: { title: '试卷管理' },
        hidden: true // 在侧边栏不显示，通过导航跳转访问
      },
      {
        path: 'score/:id',
        name: 'ScoreDetail',
        component: () => import('@/views/form/score'), // 需创建对应的详情组件
        meta: { title: '考试详情' },
        hidden: true // 在侧边栏不显示，通过导航跳转访问
      },
    ]
  },

  {
    path: '/nested',
    component: Layout,
    redirect: '/nested/menu1',
    name: 'Nested',
    meta: {
      title: 'Nested',
      icon: 'nested'
    },
    children: [
      // 嵌套路由保持不变
      {
        path: 'menu1',
        component: () => import('@/views/nested/menu1/index'),
        name: 'Menu1',
        meta: { title: 'Menu1' },
        children: [
          {
            path: 'menu1-1',
            component: () => import('@/views/nested/menu1/menu1-1'),
            name: 'Menu1-1',
            meta: { title: 'Menu1-1' }
          },
          {
            path: 'menu1-2',
            component: () => import('@/views/nested/menu1/menu1-2'),
            name: 'Menu1-2',
            meta: { title: 'Menu1-2' },
            children: [
              {
                path: 'menu1-2-1',
                component: () => import('@/views/nested/menu1/menu1-2/menu1-2-1'),
                name: 'Menu1-2-1',
                meta: { title: 'Menu1-2-1' }
              },
              {
                path: 'menu1-2-2',
                component: () => import('@/views/nested/menu1/menu1-2/menu1-2-2'),
                name: 'Menu1-2-2',
                meta: { title: 'Menu1-2-2' }
              }
            ]
          },
          {
            path: 'menu1-3',
            component: () => import('@/views/nested/menu1/menu1-3'),
            name: 'Menu1-3',
            meta: { title: 'Menu1-3' }
          }
        ]
      },
      {
        path: 'menu2',
        component: () => import('@/views/nested/menu2/index'),
        name: 'Menu2',
        meta: { title: 'menu2' }
      }
    ]
  },

  {
    path: 'external-link',
    component: Layout,
    children: [
      {
        path: 'https://panjiachen.github.io/vue-element-admin-site/#/',
        meta: { title: 'External Link', icon: 'link' }
      }
    ]
  },

  // 404 page must be placed at the end !!!
  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () => new Router({
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})

const router = createRouter()

export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher // reset router
}

export default router
