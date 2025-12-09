import VueOfficePptx from './src/main.vue';

VueOfficePptx.install = function (app) {
    app.component(VueOfficePptx.name, VueOfficePptx);
};

export default VueOfficePptx;