import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '', redirect: '/docx' },
  { path: '/docx', component: () => import('../views/docx/DocxDemo.vue') },
  { path: '/excel', component: () => import('../views/excel/ExcelDemo.vue') },
  { path: '/pdf-one', component: () => import('../views/pdf/PdfDemo.vue') },
  { path: '/pdf-toc', component: () => import('../views/pdf/PdfTocDemo.vue') },
  // { path: '/pptx', component: () => import('./components/PptxDemo.vue') },
];

export default createRouter({
  history: createWebHashHistory(),
  routes
});
