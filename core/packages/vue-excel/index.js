import VueOfficeExcel from './src/main.vue';

VueOfficeExcel.install = function (app) {
    app.component(VueOfficeExcel.name, VueOfficeExcel);
};

export default VueOfficeExcel;