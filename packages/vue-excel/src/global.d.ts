declare module "exceljs/dist/exceljs" {
  export * from "exceljs";
}

declare module 'x-data-spreadsheet/src/locale/*' {
  const locale: any;
  export default locale;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
