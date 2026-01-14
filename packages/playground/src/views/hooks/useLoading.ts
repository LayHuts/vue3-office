import { message } from 'ant-design-vue';
import {ref} from 'vue';

const loadingKey = 'vue3-office-loading';
let loading = ref(false);

function showLoading(content?: string) {
  void message.loading({content: content || '加载中...', key: loadingKey},0);
  loading.value = true;
}

function hideLoading(){
  if(loading.value === true){
    message.destroy(loadingKey);
    loading.value = false;
  }

}
export default {
  loading,
  showLoading,
  hideLoading
};
