import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth.store';
import './main.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Initialize auth before mount so guards can wait on it
const auth = useAuthStore();
auth.init().finally(() => {
  app.mount('#app');
});
