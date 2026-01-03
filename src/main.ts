import { createApp } from 'vue'
import App from './App.vue'
import './assets/style.css'
import VueApexCharts from 'vue3-apexcharts'
const app = createApp(App);
app.use(VueApexCharts as any);
app.mount('#app');
