import VueOfficeDocx from './src/main.vue';

VueOfficeDocx.install = function (app) {
    app.component(VueOfficeDocx.name, VueOfficeDocx);
};

export default VueOfficeDocx;